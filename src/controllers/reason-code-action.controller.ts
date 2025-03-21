import { FastifyRequest, FastifyReply } from 'fastify';
import ReasonCodeActionModel from '../models/reason-code-action.model';
import { ReasonCode } from '../interfaces/reason-code.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Module } from '../models/module.model';
import { Op, Sequelize, where } from 'sequelize';
import Event from '../models/event.model';
import ReasonCodeModel from '../models/reason-code.model';
import { sequelize } from '../config/instance';
import { decodeToken } from '../middlewares/verifyToken';

export async function createReasoncode(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized-Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    try {
        const reasoncode = request.body as {
            id: any;
            reasons_count: number;
            created_by: object;
            updated_by: object;
            is_deleted: boolean;
            program_id: string;
            event_id?: string;
            module_id?: string;
            slug: string;
            reason_codes: Array<{
                name: string;
                category: string;
                is_enabled: boolean
            }>;
        };
        if (reasoncode.event_id) {
            const existingEvent = await ReasonCodeActionModel.findOne({
                where: { event_id: reasoncode.event_id, is_deleted: false }
            });
            if (existingEvent) {
                return reply.status(400).send({
                    status_code: 400,
                    message: "Event already exists",
                    trace_id: traceId
                });
            }
        }
        const reason_code_action = await ReasonCodeActionModel.create({
            reasons_count: reasoncode.reasons_count,
            created_by: reasoncode.created_by,
            updated_by: reasoncode.updated_by,
            is_deleted: reasoncode.is_deleted,
            event_id: reasoncode.event_id,
            module_id: reasoncode.module_id,
            slug: reasoncode.slug,
        });

        await ReasonCodeModel.bulkCreate(
            reasoncode.reason_codes.map((reason) => ({
                name: reason.name,
                category: reason.category,
                reason_code_id: reason_code_action.id,
                is_enabled: reason.is_enabled,
                program_id: reasoncode.program_id,
                created_by: userId,
                updated_by: userId,
            }))
        );

        reply.status(201).send({
            status_code: 201,
            message: "Reasoncode created successfully",
            reason_code_id: reason_code_action.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function getAllReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { page = 1, limit = 10, module_name, reasons_count, event_name } = request.query as {
            page?: string | number;
            limit?: string | number;
            module_name?: string;
            reasons_count?: number;
            event_name?: string;
        };

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        const whereClause: any = {
            is_deleted: false,
            ...(module_name && {
                '$module.name$': { [Op.like]: `%${module_name}%` }
            }),
            ...(event_name && {
                '$supporting_text_event.name$': { [Op.like]: `%${event_name}%` }
            }),
            ...(reasons_count !== undefined && {
                reasons_count: reasons_count
            })
        };

        const { rows: reasoncodes, count: totalRecords } = await ReasonCodeActionModel.findAndCountAll({
            where: whereClause,
            attributes: {
                exclude: ['ref_id', 'updated_by', 'created_by', 'event_id', 'module_id', 'created_on', 'is_deleted', 'reason_code_limit', 'slug']
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    required: false,
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    required: false,
                },
            ],
            order: [
                [Sequelize.literal("CASE WHEN `module`.`name` IS NULL THEN 1 ELSE 0 END"), 'ASC'], // Place NULL modules last
                [{ model: Module, as: 'module' }, 'name', 'ASC'],
                ['updated_on', 'DESC'],
            ],
            limit: limitNumber,
            offset,
        });


        const reasoncodesWithDetails = reasoncodes.map((reasoncode: any) => {
            const { supporting_text_event, module, ...reasoncodeWithoutReason } = reasoncode.toJSON();
            const enabledReasonsCount = reasoncode.reasons_count || 0;

            return {
                ...reasoncodeWithoutReason,
                reasons_count: enabledReasonsCount,
                module_name: module?.name || 'Unknown Module',
                module_id: module?.id || 'Unknown id',
                event_name: supporting_text_event?.name || 'Unknown Event',
                event_id: supporting_text_event?.id || 'Unknown id',
            };
        });

        reply.status(200).send({
            status_code: 200,
            message: reasoncodesWithDetails.length
                ? 'Reasoncode retrieved successfully'
                : 'Reasoncode not found',
            items_per_page: limitNumber,
            total_records: totalRecords,
            reason_code_action: reasoncodesWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function getReasoncodeById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    let transaction = await sequelize.transaction();

    try {
        const { program_id, id } = request.params as { program_id?: string; id: string };

        let reasonCodeResponse = null;

        if (program_id) {
            const reasonCodes = await ReasonCodeModel.findAll({
                where: { reason_code_id: id, program_id },
                attributes: ['id', 'name', 'created_on', 'category', 'is_enabled'],
                transaction,
            });

            if (reasonCodes.length === 0) {
                const reasonCodesWithoutProgram = await ReasonCodeModel.findAll({
                    where: { reason_code_id: id, program_id: null },
                    attributes: ['id', 'name', 'created_on', 'category', 'is_enabled'],
                    transaction,
                });

                if (reasonCodesWithoutProgram.length > 0) {
                    const reasonCodeAction = await ReasonCodeActionModel.findOne({
                        where: {
                            id
                        },
                        include: [
                            {
                                model: Event,
                                as: 'supporting_text_event',
                                attributes: ['id', 'name'],
                                where: { is_enabled: true },
                                required: false
                            },
                            {
                                model: Module,
                                as: 'module',
                                attributes: ['id', 'name'],
                                required: false
                            },
                        ],
                        transaction
                    });

                    reasonCodeResponse = {
                        id: reasonCodesWithoutProgram[0]?.id,
                        module_name: reasonCodeAction?.module?.name || 'Unknown Module',
                        module_id: reasonCodeAction?.module?.id,
                        event_name: reasonCodeAction?.supporting_text_event?.name,
                        event_id: reasonCodeAction?.supporting_text_event?.id,
                        program_id,
                        reason_codes: reasonCodesWithoutProgram.map((reasonCode) => ({
                            id: reasonCode.id,
                            name: reasonCode.name,
                            created_on: reasonCode.created_on,
                            category: reasonCode.category,
                            is_enabled: reasonCode.is_enabled,
                        })),
                    };

                    await transaction.commit();

                    return reply.status(200).send({
                        status_code: 200,
                        message: 'Reason code retrieved successfully',
                        reason_code_action: reasonCodeResponse,
                        trace_id: traceId,
                    });
                }
            } else {
                const reasonCodeAction = await ReasonCodeActionModel.findOne({
                    where: { id },
                    include: [
                        {
                            model: Event,
                            as: 'supporting_text_event',
                            attributes: ['id', 'name'],
                            where: { is_enabled: true },
                            required: false
                        },
                        {
                            model: Module,
                            as: 'module',
                            attributes: ['id', 'name'],
                            required: false
                        },
                    ],
                    transaction
                });

                reasonCodeResponse = {
                    id: reasonCodes[0]?.id,
                    module_name: reasonCodeAction?.module?.name || 'Unknown Module',
                    module_id: reasonCodeAction?.module?.id,
                    event_name: reasonCodeAction?.supporting_text_event?.name,
                    event_id: reasonCodeAction?.supporting_text_event?.id,
                    program_id,
                    reason_codes: reasonCodes.map((reasonCode) => ({
                        id: reasonCode.id,
                        name: reasonCode.name,
                        created_on: reasonCode.created_on,
                        category: reasonCode.category,
                        is_enabled: reasonCode.is_enabled,
                    })),
                };

                await transaction.commit();

                return reply.status(200).send({
                    status_code: 200,
                    message: 'Reason code retrieved successfully',
                    reason_code_action: reasonCodeResponse,
                    trace_id: traceId,
                });
            }
        }

        const reasonCodeAction = await ReasonCodeActionModel.findOne({
            where: { id },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                    required: false
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                    required: false
                },
            ],
            transaction
        });

        if (reasonCodeAction) {
            const { supporting_text_event, module, reason_codes } = reasonCodeAction.toJSON();

            reasonCodeResponse = {
                id: reasonCodeAction.id,
                module_name: module?.name || 'Unknown Module',
                module_id: module?.id || 'Unknown ID',
                event_name: supporting_text_event?.name || 'Unknown Event',
                event_id: supporting_text_event?.id || 'Unknown ID',
                reason_codes: reason_codes || [],
            };

            await transaction.commit();

            return reply.status(200).send({
                status_code: 200,
                message: 'Reason code retrieved successfully',
                reason_code_action: reasonCodeResponse,
                trace_id: traceId,
            });
        }

        await transaction.rollback();

        return reply.status(200).send({
            status_code: 200,
            message: 'Reason code not found',
            trace_id: traceId,
        });
    } catch (error: any) {
        if (transaction) {
            await transaction.rollback();
        }
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching reason code',
            trace_id: traceId,
            error: error.message || error,
        });
    }
};

export async function getReasoncodeByEventName(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { event_slug } = request.query as { event_slug?: string };
        const event = await Event.findOne({ where: { slug: event_slug } });
        const eventId = event?.dataValues?.id;
        const reason_code = await ReasonCodeActionModel.findOne({
            where: {
                event_id: eventId
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name']
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name']
                },
            ],
        });
        if (reason_code) {
            reply.status(200).send({
                status_code: 200,
                message: 'Reason code retrieved successfully',
                reason_code_action: reason_code,
                trace_id: traceId
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Reason code not found',
                reason_code_action: [],
                trace_id: traceId
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while fetching',
            trace_id: traceId,
            error: error
        });
    }
}


export async function updateReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string; program_id: string };
    const { reason_codes }: { reason_codes: ReasonCode[] } = request.body as { reason_codes: ReasonCode[] };
    const traceId = generateCustomUUID();

    const transaction = await ReasonCodeModel.sequelize?.transaction();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized-Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub

    try {
        await ReasonCodeModel.destroy({
            where: { reason_code_id: id, program_id },
            transaction,
        });

        if (!reason_codes || reason_codes.length === 0) {
            await transaction?.rollback();
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: 'No reason codes provided in the payload',
            });
        }

        for (const reasonCodeData of reason_codes) {
            await ReasonCodeModel.create(
                {
                    ...reasonCodeData,
                    reason_code_id: id,
                    program_id,
                    updated_by: userId,
                },
                { transaction }
            );
        }

        const reasons_count = reason_codes.length;

        const reasonCodeAction = await ReasonCodeActionModel.findOne({
            where: { id },
            transaction,
        });

        if (!reasonCodeAction) {
            await transaction?.rollback();
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'Reason code action not found',
            });
        }

        await reasonCodeAction.update({ reasons_count }, { transaction });

        await transaction?.commit();

        return reply.status(200).send({
            status_code: 200,
            message: 'Reason codes updated successfully',
            reason_code_action: reasonCodeAction.id,
            trace_id: traceId,
        });
    } catch (error) {
        await transaction?.rollback();
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function deleteReasoncode(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        const [numRowsDeleted] = await ReasonCodeActionModel.update({
            is_enabled: false,
            is_deleted: true,
            updated_on: Date.now(),
        },
            { where: { id } }
        );

        if (numRowsDeleted > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Reasoncode deleted successfully",
                reason_code_action_id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Reasoncode not found',
                reason_code_action: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting',
            trace_id: traceId,
            error
        });
    }
}

export const getReasonCodeBySlug = async (
    request: FastifyRequest<{
        Params: { program_id: string },
        Querystring: { event_slug?: string, module_slug?: string }
    }>,
    reply: FastifyReply
) => {

    const { program_id } = request.params;
    const { event_slug, module_slug } = request.query;
    const traceId = generateCustomUUID();
    try {
        const event = await Event.findOne({
            where: { slug: event_slug },
            attributes: ['id'],
        });

        if (!event) {
            return reply.status(200).send({
                status_code: 200,
                message: `Event with slug '${event_slug}' not found`,
                trace_id: traceId,
            });
        }

        const module = await Module.findOne({
            where: { slug: module_slug },
            attributes: ['id'],
        });

        if (!module) {
            return reply.status(200).send({
                status_code: 200,
                message: `Module with slug '${module_slug}' not found`,
                trace_id: traceId,
            });
        }

        const event_id = event.id;
        const module_id = module.id;

        const data = await ReasonCodeActionModel.findAll({
            where: { event_id, module_id, is_deleted: false },
        });

        if (!data.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Reason codes action not found for the given event and module",
                trace_id: traceId,
            });
        }

        const reason_codes = await ReasonCodeModel.findAll({
            where: {
                reason_code_id: data.map((d) => d.id),
                program_id: program_id
            },
            attributes: ['id', 'name', 'category', 'created_on', 'updated_on', 'reason_code_id', 'program_id']
        });

        if (!reason_codes.length) {
            const reason_codes = await ReasonCodeModel.findAll({
                where: {
                    reason_code_id: data.map((d) => d.id),
                },
                attributes: ['id', 'name', 'category', 'created_on', 'updated_on', 'reason_code_id', 'program_id']
            });
            return reply.status(200).send({
                status_code: 200,
                message: "Reason codes retrieved successfully",
                reason_code_action: reason_codes,
                trace_id: traceId,
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Reason codes retrieved successfully",
            trace_id: traceId,
            reason_code_action: reason_codes,
        });

    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getReasonCodeByProgramIdAndSlug = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { slug } = request.params as { slug: string };
    try {

        const reasonCodeAction = await ReasonCodeActionModel.findOne({
            where: { slug },
        });

        if (!reasonCodeAction) {
            return reply.status(200).send({
                status_code: 200,
                message: "Reason code action not found.",
                trace_id: traceId
            });
        }

        const reasonCodes = await ReasonCodeModel.findAll({
            where: {
                reason_code_id: reasonCodeAction.id,
            },
            attributes: ['id', 'name', 'category', 'reason_code_id'],
        });

        if (!reasonCodes.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Reason code is not found.",
                trace_id: traceId,
                reason_code: []
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Reason codes retrieved successfully.",
            trace_id: traceId,
            reason_code: reasonCodes
        });

    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: traceId,
            error: error.message
        });
    }
};

export async function advancedFilterReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const {
            page = 1,
            limit = 10,
            module_name,
            reasons_count,
            event_name
        } = request.body as {
            page?: number;
            limit?: number;
            module_name?: string;
            reasons_count?: number;
            event_name?: string;
        };

        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const offset = (pageNumber - 1) * limitNumber;

        const whereClause: any = {
            is_deleted: false
        };

        if (module_name) {
            whereClause['$module.name$'] = { [Op.like]: `%${module_name}%` };
        }

        if (event_name) {
            whereClause['$supporting_text_event.name$'] = { [Op.like]: `%${event_name}%` };
        }

        if (reasons_count !== undefined) {
            whereClause.reasons_count = reasons_count;
        }

        const { rows: reasoncodes, count: totalRecords } = await ReasonCodeActionModel.findAndCountAll({
            where: whereClause,
            attributes: {
                exclude: ['ref_id', 'updated_by', 'created_by', 'event_id', 'module_id', 'created_on', 'is_deleted', 'reason_code_limit', 'slug']
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    required: false,
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    required: false,
                },
            ],
            order: [
                [Sequelize.literal("CASE WHEN `module`.`name` IS NULL THEN 1 ELSE 0 END"), 'ASC'],
                [{ model: Module, as: 'module' }, 'name', 'ASC'],
                ['updated_on', 'DESC'],
            ],
            limit: limitNumber,
            offset,
        });

        const reasoncodesWithDetails = reasoncodes.map((reasoncode: any) => {
            const { supporting_text_event, module, ...reasoncodeWithoutReason } = reasoncode.toJSON();
            const enabledReasonsCount = reasoncode.reasons_count || 0;

            return {
                ...reasoncodeWithoutReason,
                reasons_count: enabledReasonsCount,
                module_name: module?.name || 'Unknown Module',
                module_id: module?.id || 'Unknown id',
                event_name: supporting_text_event?.name || 'Unknown Event',
                event_id: supporting_text_event?.id || 'Unknown id',
            };
        });

        reply.status(200).send({
            status_code: 200,
            message: reasoncodesWithDetails.length
                ? 'Reasoncode retrieved successfully'
                : 'Reasoncode not found',
            items_per_page: limitNumber,
            total_records: totalRecords,
            reason_code_action: reasoncodesWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message,
        });
    }
}