import { FastifyRequest, FastifyReply } from 'fastify';
import supportingTextModel from '../models/supporting-text.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { supportingTextAttributes } from '../interfaces/supporting-text.interface';
import Event from '../models/event.model';
import { Module } from '../models/module.model';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const getAllSupportingTexts = async (request: FastifyRequest<{ Params: { program_id: string, page?: number, limit?: number }; Querystring: { performed_by?: string, event_slug: string, date_range?: string, module_name?: string, event_name?: string, page?: number, limit?: number } }>, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const { program_id, page = 1, limit = 10 } = request.params;
        const { performed_by, event_slug, date_range, event_name, module_name } = request.query;

        const whereConditions: any = { program_id, is_deleted: false };

        if (performed_by) {
            whereConditions.performed_by = performed_by;
        }

        if (date_range) {
            const [startDate, endDate] = date_range.split(',').map(ts => parseInt(ts, 10));
            whereConditions[Op.or] = [
                {
                    created_on: {
                        [Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                },
                {
                    modified_on: {
                        [Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                },
            ];
        }

        const includeConditions: any[] = [
            {
                model: Event,
                as: 'event',
                attributes: ['id', 'name', 'slug'],
                where: {
                    ...(event_name ? { name: event_name } : {}),
                    ...(event_slug ? { slug: event_slug } : {})
                }
            },            
            {
                model: Module,
                as: 'module',
                attributes: ['id', 'name'],
                where: module_name ? { name: module_name } : undefined,
            }
        ];

        const offset = (page - 1) * limit;

        const { rows: supportingText, count } = await supportingTextModel.findAndCountAll({
            where: whereConditions,
            include: includeConditions,
            limit,
            offset,
        });

        if (!supportingText || supportingText.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Supporting Text not found.',
                supportingText: [],
                trace_id:traceId
            });
        }

        const responseData = supportingText.map(text => ({
            id: text.id,
            performed_by: text.performed_by,
            is_enabled: text.is_enabled,
            is_deleted: text.is_deleted,
            created_on: text.created_on,
            event_id: {
                id: text.event?.id,
                name: text.event?.name,
                slug: text.event?.slug
            },
            module_id: {
                id: text.module?.id,
                name: text.module?.name
            },
            support_text_action: text.support_text_action
        }));

        reply.status(200).send({
            status_code: 200,
            message: 'Supporting Texts retrieved successfully.',
            total_records: count,
            total_pages: Math.ceil(count / limit),
            current_page: page,
            trace_id: traceId,
            support_text_data: responseData,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id:traceId
        });
    }
};


export const getSupportingText = async (request: FastifyRequest<{ Params: { id: string; program_id: string } }>, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const { id, program_id } = request.params;
        const supportingText = await supportingTextModel.findOne({
            where: { id, program_id, is_deleted: false },
            include: [
                {
                    model: Event,
                    as: 'event',
                    attributes: ['id', 'name', 'slug'],
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                }
            ],
        });

        if (!supportingText) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Supporting Text not found.',
                supportingText: [],
                trace_id:traceId
            });
        }

        const responseData = {
            id: supportingText.id,
            performed_by: supportingText.performed_by,
            is_enabled: supportingText.is_enabled,
            is_deleted: supportingText.is_deleted,
            created_on: supportingText.created_on,
            event_id: supportingText.event ? {
                id: supportingText.event.id,
                name: supportingText.event.name,
                slug: supportingText.event.slug
            } : null,
            module_id: supportingText.module ? {
                id: supportingText.module.id,
                name: supportingText.module.name
            } : null,
            support_text_action: supportingText.support_text_action
        };

        reply.status(200).send({
            status_code: 200,
            message: 'Supporting Text retrieved successfully.',
            support_text_data: responseData,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id:traceId
        });
    }
};

export const createSupportingText = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as supportingTextAttributes;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({status_code:401, message: 'Unauthorized - Token not found',trace_id:traceId });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({status_code:401, message: 'Unauthorized - Invalid token',trace_id:traceId });
    }
    logger(
        {
            trace_id:traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating supportingText",
            status: "success",
            description: `Creating supportingText for ${data.program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: data.program_id,
            is_deleted: false
        },
        supportingTextModel
    );
    try {

        if (!data.program_id) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Program ID is required.',
                trace_id: traceId
            });
        }

        const newSupportingText = await supportingTextModel.create({
            ...data,
        });

        reply.status(201).send({
            status_code: 201,
            message: `Supporting text created successfully.`,
            support_text_data: newSupportingText.id,
            trace_id:traceId,
        });
        logger(
            {
                trace_id:traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create supportingText",
                status: "success",
                description: `create supportingText for ${data.program_id} successfully.`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: data.program_id,
                is_deleted: false
            },
            supportingTextModel
        );
    } catch (error: any) {
        logger(
            {
                trace_id:traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create supportingText",
                status: "failed",
                description: `Failed to create supportingText for ${data.program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: data.program_id,
                is_deleted: false
            },
            supportingTextModel
        )
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            error: error.message || 'Unknown error',
            trace_id:traceId,
        });
    }
};

export const updateSupportingText = async (
    request: FastifyRequest<{ Params: { id: string }; Body: Partial<supportingTextModel> }>,
    reply: FastifyReply
) => {
    const traceId=generateCustomUUID();
    const { id } = request.params;
    const {
        performed_by,
        is_enabled,
        is_deleted,
        created_on,
        modified_on,
        created_by,
        modified_by,
        program_id,
        event_id,
        module_id,
        support_text_action,
    } = request.body;

    try {
        const supportingText = await supportingTextModel.findByPk(id);

        if (!supportingText) {
            return reply.status(200).send({ status_code: 200, message: 'Supporting Text not found.' ,trace_id:traceId});
        }

        await supportingText.update({
            performed_by: performed_by ?? supportingText.performed_by,
            is_enabled: typeof is_enabled === 'boolean' ? is_enabled : supportingText.is_enabled,
            is_deleted: typeof is_deleted === 'boolean' ? is_deleted : supportingText.is_deleted,
            created_on: created_on ?? supportingText.created_on,
            modified_on: modified_on ?? supportingText.modified_on,
            created_by: created_by ?? supportingText.created_by,
            modified_by: modified_by ?? supportingText.modified_by,
            program_id: program_id ?? supportingText.program_id,
            event_id: event_id ?? supportingText.event_id,
            module_id: module_id ?? supportingText.module_id,
            support_text_action: support_text_action ?? supportingText.support_text_action,
        });

        reply.send({
            status_code: 200,
            message: 'Supporting Text updated successfully.',
            support_text_data: supportingText,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Internal Server Error' ,trace_id:traceId});
    }
};

export const deleteSupportingText = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const supportingText = await supportingTextModel.findByPk(request.params.id);

        if (!supportingText) {
            return reply.status(200).send({ status_code: 200, message: 'Supporting Text not found' ,trace_id:traceId});
        }

        const [updated] = await supportingTextModel.update(
            { is_deleted: true, is_enabled: false },
            { where: { id: request.params.id } }
        );

        if (updated) {
            reply.send({
                status_code: 200,
                message: 'Supporting Text deleted successfully.',
                data: updated,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Supporting Text not Updated.' ,trace_id:traceId});
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Internal Server Error', trace_id:traceId });
    }
};

