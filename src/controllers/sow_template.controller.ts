import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from 'sequelize';
import SowTemplateModel from '../models/sow_template.model';
import SowTemplateHierarchyModel from '../models/sow_template_hierarchy.model';
import SowTemplateMasterDataModel from '../models/sow_temp_master_data.model';
import SowTemplateCustomFieldsModel from '../models/sow_temp_custom_fields.model';
import { sequelize } from '../config/instance';
import { getSowTemplateByIdQuery, getSowTemplatesCountQuery, getSowTemplatesQuery } from '../repositories/sow-template.repository';
import { SowTemplate } from '../interfaces/sow_template.interface';

export async function createSowTemplate(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const program_id = request.params.program_id;
    const sowTemplate = request.body as SowTemplate;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
    try {
        const item = await SowTemplateModel.create({
            ...sowTemplate, program_id, created_by: userId,
            updated_by: userId,
        });
        if (Array.isArray(sowTemplate.hierarchy) && sowTemplate.hierarchy.length > 0) {
            for (const hierarchyId of sowTemplate.hierarchy) {
                await SowTemplateHierarchyModel.create({
                    sow_template_id: item.id,
                    hierarchy_id: hierarchyId,
                    created_by: userId,
                    updated_by: userId,
                });
            }
        }
        if (Array.isArray(sowTemplate.master_date_type) && sowTemplate.master_date_type.length > 0) {
            for (const masterDataId of sowTemplate.master_date_type) {
                await SowTemplateMasterDataModel.create({
                    sow_template_id: item.id,
                    master_data_type_id: masterDataId,
                    master_data: JSON.stringify({}),
                    created_by: userId,
                    updated_by: userId,
                });
            }
        }
        if (Array.isArray(sowTemplate.custom_fields) && sowTemplate.custom_fields.length > 0) {
            for (const customField of sowTemplate.custom_fields) {
                await SowTemplateCustomFieldsModel.create({
                    sow_template_id: item.id,
                    custom_field_id: customField.id,
                    value: customField.value,
                    created_by: userId,
                    updated_by: userId,
                });
            }
        }
        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: "Sow template created successfully.",
            sowTemplate: item.id,
        });
    } catch (error: any) {
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
            hierarchy_id
        } = request.query as {
            page?: string | number;
            limit?: string | number;
            type?: string;
            template_title?: string;
            hierarchy_id?: string;
        };

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        let whereClause = `t.program_id = :program_id AND t.is_deleted = false`;
        const replacements: any = { program_id, limit: limitNumber, offset };
        if (type) {
            whereClause += ` AND t.type = :type`;
            replacements.type = type;
        }
        if (template_title) {
            whereClause += ` AND t.template_title LIKE :template_title`;
            replacements.template_title = `%${template_title}%`;
        }
        if (hierarchy_id) {
            const hierarchyIdsArray = hierarchy_id.split(',');
            whereClause += ` AND EXISTS (
                SELECT 1 FROM sow_template_hierarchy h 
                WHERE h.sow_template_id = t.id AND h.hierarchy_id IN (:hierarchyIds)
            )`;
            replacements.hierarchyIds = hierarchyIdsArray;
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
            picklist_items:template.picklist_items,
            created_on:template.created_on,
            updated_on:template.updated_on
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
    const { id, program_id } = request.params as { id: string; program_id: string };
    const sowTemplate = request.body as SowTemplate;
    const userId = request.headers['user_id'];

    try {
        const template = await SowTemplateModel.findOne({ where: { id, program_id, is_deleted: false } });

        if (!template) {
            return reply.status(200).send({
                status_code: 200,
                message: 'SOW Template not found.',
                trace_id: traceId
            });
        }
        await template.update(sowTemplate);
        await SowTemplateHierarchyModel.destroy({ where: { sow_template_id: id } });
        await SowTemplateMasterDataModel.destroy({ where: { sow_template_id: id } });
        await SowTemplateCustomFieldsModel.destroy({ where: { sow_template_id: id } });

        if (Array.isArray(sowTemplate.hierarchy) && sowTemplate.hierarchy.length > 0) {
            for (const hierarchyId of sowTemplate.hierarchy) {
                await SowTemplateHierarchyModel.create({
                    sow_template_id: id,
                    hierarchy_id: hierarchyId,
                    created_by: userId,
                    updated_by: userId,
                });
            }
        }

        if (Array.isArray(sowTemplate.master_date_type) && sowTemplate.master_date_type.length > 0) {
            for (const masterDataId of sowTemplate.master_date_type) {
                await SowTemplateMasterDataModel.create({
                    sow_template_id: id,
                    master_data_type_id: masterDataId,
                    master_data: JSON.stringify({}),
                    created_by: userId,
                    updated_by: userId,
                });
            }
        }

        if (Array.isArray(sowTemplate.custom_fields) && sowTemplate.custom_fields.length > 0) {
            for (const customField of sowTemplate.custom_fields) {
                await SowTemplateCustomFieldsModel.create({
                    sow_template_id: id,
                    custom_field_id: customField.id,
                    value: customField.value,
                    created_by: userId,
                    updated_by: userId,
                });
            }
        }

        reply.status(200).send({
            status_code: 200,
            message: 'SOW Template updated successfully.',
            trace_id: traceId
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating SOW template.',
            error: error.message,
            trace_id: traceId
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
