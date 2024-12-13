import { FastifyRequest, FastifyReply } from 'fastify';
import ReasoncodeModel from '../models/reasoncodeModel';
import { ReasonCode, ReasonCodeResponse } from '../interfaces/reasoncodeInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Module } from '../models/moduleModel';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import Event from '../models/event.model';
import { resonCode } from '../utility/queries';
import { sequelize } from '../config/instance';

export async function createReasoncode(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const reasoncode = request.body as ReasonCodeResponse;

        if (!reasoncode.program_id || !reasoncode.reason || !Array.isArray(reasoncode.reason)) {
            return reply.status(400).send({
                status_code: 400,
                message: "Invalid payload structure",
                trace_id: generateCustomUUID(),
            });
        }

        for (const reason of reasoncode.reason) {
            if (!reason.name) {
                return reply.status(400).send({
                    status_code: 400,
                    message: "Each reason must have a name",
                    trace_id: generateCustomUUID(),
                });
            }
            const isExist = await ReasoncodeModel.findOne({
                where: {
                    program_id: reasoncode.program_id,
                    reason: {
                        [Op.ne]: null,
                        [Op.and]: [
                            Sequelize.literal(`JSON_SEARCH(reason, 'one', '${reason.name}') IS NOT NULL`)
                        ]
                    }
                }
            });

            if (isExist) {
                return reply.status(400).send({
                    status_code: 400,
                    message: `Reason code with the name ${reason.name} already exists!`,
                    trace_id: generateCustomUUID(),
                });
            }
        }

        const reason_code = await ReasoncodeModel.create({
            program_id: reasoncode.program_id,
            module_id: reasoncode.module_id,
            event_id: reasoncode.event_id,
            reason: reasoncode.reason
        });
        reply.status(201).send({
            status_code: 201,
            reason_code_id: reason_code.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        console.error("Error in createReasoncode:", error);
        reply.status(500).send({
            message: 'An error occurred while creating reason codes',
            error,
        });
    }
}

export async function getReasoncode(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, module_name, reasons_count, event_name } = request.query as {
            page?: number,
            limit?: number,
            module_name?: string,
            reasons_count?: number,
            event_name?: string
        };

        const offset = (page - 1) * limit;

        const reasoncodes = await ReasoncodeModel.findAll({
            where: {
                program_id,
                is_deleted: false,
                ...(module_name && {
                    '$module.name$': { [Op.like]: `%${module_name}%` }
                }),
                ...(event_name && {
                    '$supporting_text_event.name$': { [Op.like]: `%${event_name}%` }
                })
            },
            attributes: {
                exclude: ['ref_id', 'modified_by', 'created_by', 'event_id', 'module_id', 'created_on', 'is_deleted', 'reason_code_limit']
            },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                    required: false,
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                    required: false,
                },
            ],
            order: [['created_on', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
        });

        const reasoncodesWithDetails = reasoncodes.map((reasoncode: any) => {
            const { reason, supporting_text_event, module, ...reasoncodeWithoutReason } = reasoncode.toJSON();
            const enabledReasonsCount = Array.isArray(reason)
                ? reason.filter((r: any) => !r.is_deleted).length
                : 0;

            return {
                ...reasoncodeWithoutReason,
                reasons_count: enabledReasonsCount,
                module_name: module?.name || 'Unknown Module',
                module_id: module?.id || 'Unknown id',
                event_name: supporting_text_event?.name || 'Unknown Event',
                event_id: supporting_text_event?.id || 'Unknown id',
            };
        });

        const filteredReasoncodes = reasons_count !== undefined
            ? reasoncodesWithDetails.filter((rc) => rc.reasons_count === reasons_count)
            : reasoncodesWithDetails;

        const totalRecords = await ReasoncodeModel.count({
            where: {
                program_id,
                is_deleted: false,
            }
        });

        if (!filteredReasoncodes || filteredReasoncodes.length === 0) {
            return reply.status(200).send({ message: "Reasoncode not found", reasoncodes: [], totalRecords });
        }

        reply.status(200).send({
            status_code: 200,
            reasoncodes: filteredReasoncodes,
            trace_id: generateCustomUUID(),
            total_records: totalRecords,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            error: error,
        });
    }
}

export async function getReasoncodeId(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    try {
        const { id, program_id } = request.params;
        const reason_code = await ReasoncodeModel.findOne({
            where: { id, program_id },
            attributes: { exclude: ['ref_id', 'entity_ref', 'code', 'program_id', 'event_id', 'module_id', 'is_deleted', 'created_on', 'reasons_count', 'created_by', 'modified_by', 'reason_code_limit', 'modified_on'] },
            include: [
                {
                    model: Event,
                    as: 'supporting_text_event',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                },
                {
                    model: Module,
                    as: 'module',
                    attributes: ['id', 'name'],
                    where: { is_enabled: true },
                },
            ],
        });

        if (reason_code) {
            const reasoncode = reason_code.toJSON();  // Convert to plain object
            // Destructure and remove `module` from the response
            const { reason, supporting_text_event, module, ...reasoncodeWithoutExtras } = reasoncode;
            const reasoncodeWithDetails = {
                ...reasoncodeWithoutExtras,
                module_name: module?.name || 'Unknown Module',
                module_id: module?.id || 'Unknown id',
                event_name: supporting_text_event?.name || 'Unknown Event',
                event_id: supporting_text_event?.id || 'Unknown id',
                reason,
            };

            reply.status(200).send({
                status_code: 200,
                reason_code: reasoncodeWithDetails,
                trace_id: generateCustomUUID(),  // Assuming you have this function defined somewhere
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                reason_code: [],  // Return empty array
                trace_id: generateCustomUUID(),  // Assuming you have this function defined somewhere
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while fetching',
            error: error
        });
    }
}
export async function getReasoncodeByEventName(
    request: FastifyRequest<{ Params: { event_slug: string, program_id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id } = request.params;
        const { event_slug } = request.query as {
            event_slug?: string
        };
        const event= await Event.findOne({ where: { slug: event_slug } });
        const eventId =event?.dataValues?.id;
        const reason_code = await ReasoncodeModel.findOne({
            where: {
                program_id,
                event_id:eventId
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
        if(reason_code){
            reply.status(200).send({
                status_code: 200,
                reason_code: reason_code,
                trace_id: generateCustomUUID(),  // Assuming you have this function defined somewhere
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                reason_code: [],  // Return empty array
                trace_id: generateCustomUUID(),  // Assuming you have this function defined somewhere
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while fetching',
            error: error
        });
    }
}
export async function updateReasoncode(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const reasonCodeData = request.body as ReasonCode;
    try {
        const reasonCode: ReasoncodeModel | null = await ReasoncodeModel.findByPk(id);
        if (reasonCode) {
            if (
                reasonCodeData.program_id && reasonCodeData.program_id !== reasonCode.program_id ||
                reasonCodeData.module_id && reasonCodeData.module_id !== reasonCode.module_id ||
                reasonCodeData.event_id && reasonCodeData.event_id !== reasonCode.event_id
            ) {
                return reply.status(400).send({
                    status_code: 400,
                    message: 'program_id, module_id, and event_id fields cannot be modified',
                });
            }
            await reasonCode.update(reasonCodeData);
            reply.status(200).send({
                status_code: 200,
                reason_code: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'Custom Field not found' });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteReasoncode(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    try {
        const { id, program_id } = request.params;
        const [numRowsDeleted] = await ReasoncodeModel.update({
            is_enabled: false,
            modified_on: Date.now(),
        },
            { where: { id, program_id } }
        );

        if (numRowsDeleted > 0) {
            reply.status(200).send({
                status_code: 200,
                reason_code_id: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'Reasoncode not found' });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An error occurred while deleting', error });
    }
}

export const getReasonCodeByModuleEventName = async (
    request: FastifyRequest<{
        Params: { program_id: string },
        Querystring: { module_name?: string, event_name?: string }
    }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const { module_name, event_name } = request.query;

    try {
        const data = await sequelize.query(resonCode, {
            replacements: {
                program_id,
                module_name: module_name ? `%${module_name}%` : null,
                event_name: event_name ? `%${event_name}%` : null,
            },
            type: QueryTypes.SELECT,
        });

        const transformedData = data.map((item: any) => ({
            module_name:module_name,
            event_name:event_name,
            reason_name: item?.reason?.[0]?.name || null,
            reason_label: item?.reason?.[0]?.label || null, 
          }));

        reply.status(200).send({
            status_code: 200,
            message: "Reason codes retrieved successfully",
            data: transformedData,
            trace_id: generateCustomUUID(),
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: generateCustomUUID(),
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

