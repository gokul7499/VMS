import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';
import { QueryTypes } from 'sequelize';
import SowTemplateModel from '../models/sow_template.model';
import SowTemplateHierarchyModel from '../models/sow_template_hierarchy.model';

import { sequelize } from '../config/instance';
import { getSowTemplateByIdQuery, getSowTemplatesCountQuery, getSowTemplatesQuery } from '../repositories/sow-template.repository';
import { SowTemplate } from '../interfaces/sow_template.interface';
import SOWTemplateMasterDataModel from '../models/sow-templare-master-data.model';
import SowTemplateCustomField from '../models/sow-template-custom-flied.model';

export async function createSowTemplate(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const program_id = request.params.program_id;
    const sowTemplate = request.body as SowTemplate;
    const traceId = generateCustomUUID();
    const entityId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub;
    const sequelize = SowTemplateModel.sequelize!;
    const transaction = await sequelize.transaction();
    try {
        const existingSowTemplate = await SowTemplateModel.findOne({
            where: {
                latest: true,
                program_id: program_id,
                template_title: sowTemplate.template_title,
                is_deleted: false,
            }
        });

        if (existingSowTemplate) {
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: "SOW Template Title already exists",
            });
        }

        const item = await SowTemplateModel.create({
            ...sowTemplate,
            entity_id: entityId,
            program_id,
            latest: true,
            created_by: userId,
            updated_by: userId,
        }, { transaction });
        if (Array.isArray(sowTemplate.hierarchy) && sowTemplate.hierarchy.length > 0) {
            for (const hierarchyId of sowTemplate.hierarchy) {
                await SowTemplateHierarchyModel.create({
                    sow_template_id: item.id,
                    hierarchy_id: hierarchyId,
                    created_by: userId,
                    updated_by: userId,
                }, { transaction });
            }
        }

        if (Array.isArray(sowTemplate.master_data) && sowTemplate.master_data.length > 0) {
            for (const master of sowTemplate.master_data) {
                await SOWTemplateMasterDataModel.create({
                    sow_temp_id: item.id,
                    master_data_type: master.master_data_type,
                    master_data: master.master_data,
                    is_deleted: false,
                    is_enabled: true,
                    created_by: userId,
                    updated_by: userId,
                    created_on: Date.now(),
                    updated_on: Date.now(),
                }, { transaction });
            }
        }

        if (Array.isArray(sowTemplate.custom_fields)) {
            for (const field of sowTemplate.custom_fields) {
                await SowTemplateCustomField.create({
                    custom_field_id: field.id,
                    value: field.value,
                    sow_temp_id: item.id,
                    is_deleted: false,
                    is_enabled: true,
                    created_by: userId,
                    updated_by: userId,
                    created_on: Date.now(),
                    updated_on: Date.now(),
                }, { transaction });
            }
        }


        await transaction.commit();
        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: "SOW template created successfully.",
            sowTemplate: item.id,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

export const getAllSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params as { program_id: string };
        const {
            page = 1,
            limit = 10,
            type,
            template_title,
            hierarchy_id,
            code,
            updated_on
        } = request.query as {
            page?: string | number;
            limit?: string | number;
            type?: string;
            template_title?: string;
            hierarchy_id?: string;
            code?: string;
            updated_on?: string;
        };

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        let whereClause = `t.program_id = :program_id AND t.is_deleted = false AND t.latest = true`;
        const replacements: any = { program_id, limit: limitNumber, offset };

        if (type) {
            whereClause += ` AND EXISTS (
                SELECT 1 
                FROM picklistitems p
                WHERE p.id = t.type 
                AND p.id = :type 
            )`;
            replacements.type = type;
        }

        if (template_title) {
            whereClause += ` AND t.template_title LIKE :template_title`;
            replacements.template_title = `%${template_title}%`;
        }

        if (code) {
            whereClause += ` AND t.code LIKE :code`;
            replacements.code = `%${code}%`;
        }

        if (hierarchy_id) {
            const hierarchyIdsArray = hierarchy_id.split(',');
            whereClause += ` AND EXISTS (
                SELECT 1 FROM sow_template_hierarchy h 
                WHERE h.sow_template_id = t.id AND h.hierarchy_id IN (:hierarchyIds)
            )`;
            replacements.hierarchyIds = hierarchyIdsArray;
        }
        if (updated_on) {
            const dateRange = updated_on.split(',');
            if (dateRange.length === 2) {
                const startDate = dateRange[0].trim();
                const endDate = dateRange[1].trim();
                const startTimestamp = isNaN(Number(startDate))
                    ? new Date(startDate).getTime()
                    : Number(startDate);

                const endTimestamp = isNaN(Number(endDate))
                    ? new Date(endDate).getTime()
                    : Number(endDate);

                if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
                    const adjustedEndTimestamp = endTimestamp + (24 * 60 * 60 * 1000 - 1);
                    whereClause += ` AND t.updated_on BETWEEN :updatedStartDate AND :updatedEndDate`;
                    replacements.updatedStartDate = startTimestamp;
                    replacements.updatedEndDate = adjustedEndTimestamp;
                } else {
                    console.warn('Invalid updated_on date format provided');
                }
            }
        }

        const templates: any[] = await sequelize.query(getSowTemplatesQuery(whereClause), {
            replacements,
            type: QueryTypes.SELECT,
        });

        const totalResult: any[] = await sequelize.query(getSowTemplatesCountQuery(whereClause), {
            replacements,
            type: QueryTypes.SELECT,
        });
        const totalRecords = totalResult[0]?.total || 0;

        templates.forEach(template => {
            template.hierarchy = JSON.parse(template.hierarchy || '[]');
        });

        const filteredTemplates = templates.map(template => ({
            id: template.id,
            code: template.code,
            program_id: template.program_id,
            type: template.type,
            template_title: template.template_title,
            description: template.description,
            hierarchy: template.hierarchy,
            picklist_items: template.picklist_items,
            created_on: template.created_on,
            updated_on: template.updated_on,
            is_sow_assignment: template.is_sow_assignment,
            is_sow_expense: template.is_sow_assignment,
            is_sow_milestones: template.is_sow_milestones,
            is_sow_payment_req: template.is_sow_payment_req,
            is_sow_schedule_payments: template.is_sow_schedule_payments,
            is_sow_desc_mandatory: template.is_sow_desc_mandatory,
        }));

        reply.status(200).send({
            status_code: 200,
            message: 'SOW Templates retrieved successfully.',
            items_per_page: limitNumber,
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            data: filteredTemplates,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching SOW templates.',
            error: error.message,
            trace_id: traceId,
        });
    }
};



export const getSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };

        const replacements = { id, program_id };

        const [sowTemplateRecord]: any[] = await sequelize.query(getSowTemplateByIdQuery, {
            replacements,
            type: QueryTypes.SELECT,
        });

        if (!sowTemplateRecord) {
            return reply.status(200).send({
                status_code: 200,
                message: 'SOW Template not found.',
                trace_id: traceId
            });
        }
        const fieldsToBoolean = [
            'is_sow_assignment', 'is_sow_expense', 'is_sow_milestones',
            'is_sow_payment_req', 'is_sow_schedule_payments',
            'is_sow_desc_mandatory', 'is_update_sow_desc',
            'is_req_doc_mandatory', 'is_deleted'
        ];

        fieldsToBoolean.forEach(field => {
            if (sowTemplateRecord[field] !== undefined) {
                sowTemplateRecord[field] = sowTemplateRecord[field] === 1;
            }
        });

        sowTemplateRecord.hierarchy = JSON.parse(sowTemplateRecord.hierarchy || '[]');
        sowTemplateRecord.custom_fields = JSON.parse(sowTemplateRecord.custom_fields || '[]');
        sowTemplateRecord.master_data = JSON.parse(sowTemplateRecord.master_data || '[]');

        return reply.status(200).send({

            status_code: 200,
            message: 'SOW Template retrieved successfully.',
            data: sowTemplateRecord,
            trace_id: traceId

        });

    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Error fetching SOW template.',
            error: error.message,
            trace_id: traceId
        });
    }
};



export const updateSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();

    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const sowTemplate = request.body as SowTemplate;
        const userId = request.headers['user_id'];

        const existingTemplate = await SowTemplateModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
                latest: true,
            },
            transaction,
        });

        if (!existingTemplate) {
            await transaction.rollback();
            return reply.status(200).send({
                status_code: 200,
                message: 'SOW Template not found.',
                trace_id: traceId,
            });
        }
        await existingTemplate.update(
            { latest: false },
            { transaction }
        );
        const oldRevision = Number(existingTemplate.revision ?? 0);
        const newRevision = oldRevision + 1;
        const newTemplate = await SowTemplateModel.create(
            {
                ...existingTemplate.toJSON(),
                ...sowTemplate,
                id: undefined,
                revision: newRevision,
                latest: true,
                created_on: userId,
                created_by: userId,
                updated_on: Date.now(),
                updated_by: userId,
            },
            { transaction }
        );

        if (Array.isArray(sowTemplate.hierarchy) && sowTemplate.hierarchy.length > 0) {
            for (const hierarchyId of sowTemplate.hierarchy) {
                await SowTemplateHierarchyModel.create({
                    sow_template_id: newTemplate.id,
                    hierarchy_id: hierarchyId,
                    created_by: userId,
                    updated_by: userId,
                },
                    { transaction }
                );
            }
        }
        await transaction.commit();
        return reply.status(200).send({
            status_code: 200,
            message: 'SOW template versioned update successful.',
            trace_id: traceId,
            data: newTemplate,
        });
    } catch (error: any) {
        await transaction.rollback();
        return reply.status(500).send({
            status_code: 500,
            message: 'Error updating SOW template.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const deleteSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string; program_id: string };
    try {
        const template = await SowTemplateModel.findOne({ where: { id, program_id, is_deleted: false } });

        if (!template) {
            return reply.status(200).send({ status_code: 200, message: 'SOW Template not found.', trace_id: traceId });
        }

        await template.update({ is_deleted: true });
        reply.status(200).send({ status_code: 200, message: 'SOW Template deleted successfully.', trace_id: traceId });
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Error deleting SOW template.', error, trace_id: traceId });
    }
};



export const getSowTemplateHierarchiesByProgram = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const sowTemplates = await SowTemplateModel.findAll({
            where: { program_id, is_deleted: false },
            attributes: ['id'],
        });

        const sowTemplateIds = sowTemplates.map(template => template.id);

        if (!sowTemplateIds.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "No hierarchies found for the given program.",
                trace_id: traceId,
                data: [],
            });
        }
        const query = `
    SELECT COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'id', unique_hierarchies.hierarchy_id,
            'hierarchy_name', unique_hierarchies.name
        ))
        FROM (
            SELECT DISTINCT h.hierarchy_id, hier.name
            FROM sow_template_hierarchy h
            LEFT JOIN hierarchies hier ON h.hierarchy_id = hier.id
            WHERE h.sow_template_id IN (:sowTemplateIds)
        ) AS unique_hierarchies), '[]') AS hierarchy;
`;

        const result = await sequelize.query(query, {
            replacements: { sowTemplateIds },
            type: QueryTypes.SELECT,
        });
        const hierarchiesData = JSON.parse((result[0] as { hierarchy: string }).hierarchy || '[]');
        reply.status(200).send({
            status_code: 200,
            message: "SOW Template Hierarchies fetched successfully",
            trace_id: traceId,
            data: { hierarchy: hierarchiesData },
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Error while fetching SOW Template Hierarchies.',
            error: error.message,
        });
    }
};
