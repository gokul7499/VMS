import { FastifyRequest, FastifyReply } from "fastify";
import DistScheduleDetail from "../models/distScheduleDetailModel";
import { DistScheduleDetailInterface } from "../interfaces/distScheduleDetailInterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const createDistScheduleDetails = async (request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply) => {
    const { program_id } = request.params;
    const distScheduleDetailsData = request.body as DistScheduleDetailInterface[];
    const trace_id = generateCustomUUID();

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    logger(
        {
            trace_id,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating distribution schedule details",
            status: "success",
            description: `creating distribution schedule details for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        DistScheduleDetail
    );

    try {
        const newDistScheduleDetails = await DistScheduleDetail.bulkCreate(distScheduleDetailsData.map(detail => ({
            ...detail,
            program_id: program_id
        })));

        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create distribution schedule details",
                status: "success",
                description: `create distribution schedule details for ${program_id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            DistScheduleDetail
        );

        reply.status(201).send({
            status_code: 201,
            message: "Distribution Schedule Details created successfully.",
            data: newDistScheduleDetails.map((detail: DistScheduleDetail) => ({
                id: detail.id,
                program_id: detail.program_id,
            })),
            trace_id,
        });

    } catch (error) {
        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating distribution schedule details",
                status: "error",
                description: `Error creating distribution schedule details for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            DistScheduleDetail
        );

        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id,
            error,
        });
    }
};

export const getAllDistScheduleDetails = async (request: FastifyRequest, reply: FastifyReply) => {
    const searchFields = ["program_id", "measure_unit", "vendor_data", "is_enabled"];
    const responseFields = ["id", "duration", "measure_unit", "vendor_data", "is_enabled", "modified_on"];
    return baseSearch(request, reply, DistScheduleDetail, searchFields, responseFields);
};

export const getDistScheduleDetailById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { program_id, id } = request.params as { id: string, program_id: string };

    try {
        const detail = await DistScheduleDetail.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (detail) {
            reply.status(200).send({
                status_code: 200,
                data: detail,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                dist_schedule_detail: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: generateCustomUUID(),
            error,
        });
    }
};

export const deleteDistScheduleDetail = async (
    request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
    reply: FastifyReply
) => {
    const { id, program_id } = request.params;

    try {
        const [DistSchedule] = await DistScheduleDetail.update(
            { is_deleted: true, is_enabled: false },
            {
                where: { id, program_id, is_deleted: false },
            }
        );

        if (DistSchedule === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Distribution Schedule Detail not found.",
                dist_schedule_detail: [],
                trace_id: generateCustomUUID(),
            });
        }
        reply.status(204).send({
            status_code: 204,
            message: "Distribution Schedule Detail deleted successfully.",
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: generateCustomUUID(),
            error,
        });
    }
};


export const updateDistScheduleDetail = async (
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) => {
    const { program_id, id } = request.params;

    try {
        const [updatedCount] = await DistScheduleDetail.update(request.body as DistScheduleDetailInterface, {
            where: { program_id, id },
        });

        if (updatedCount > 0) {
            reply.send({
                status_code: 200,
                message: "Distribution Schedule Detail updated successfully.",
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                dist_schedule_detail: [],
                massage: "Distribution Schedule Detail not found."
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: generateCustomUUID(),
            error,
        });
    }
};
