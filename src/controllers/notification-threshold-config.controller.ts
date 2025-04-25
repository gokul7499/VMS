import { FastifyRequest, FastifyReply } from 'fastify';
import thresholdConfig from '../models/notification-threshold-config.model';
import { decodeToken } from '../middlewares/verifyToken';
import generateCustomUUID from '../utility/genrateTraceId';
import { ProgramThresholdInput } from '../interfaces/notification-threshold.interface';
import { sequelize } from '../config/instance';

export const createThreshold = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();

    try {
        const { program_id } = request.params;
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Token not found',
            });
        }

        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);

        if (!user) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Invalid token',
            });
        }

        const body = request.body as any;

        if (
            typeof body?.module !== 'string' ||
            body.module.trim() === '' ||
            !Array.isArray(body?.config) ||
            body.config.length === 0
        ) {
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: "module must be a non-empty string and config must be a non-empty array",
            });
        }

        const { module, config } = body;

        const timestamp = Date.now();

        const newThreshold = await thresholdConfig.create(
            {
                program_id,
                module,
                config,
                is_enabled: true,
                is_deleted: false,
                created_on: timestamp,
                updated_on: timestamp,
                created_by: user?.sub,
                updated_by: user?.sub,
            },
            { transaction }
        );

        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: newThreshold.id,
            message: 'Threshold configuration created successfully',
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
        });
    }
};


export const getAllThresholds = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
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

    try {
        const { program_id } = request.params;
        const data = await thresholdConfig.findAll({
            where: {
                is_deleted: false,
                program_id,
            },
        });

        if (data.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                data: [],
            });
        }

        reply.send({
            status_code: 200,
            message: 'Fetched successfully',
            trace_id: traceId,
            data,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching data',
            trace_id: traceId
        });
    }
};


export const getThresholdById = async (
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) => {
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

    try {

        const { id, program_id } = request.params;
        const record = await thresholdConfig.findOne({
            where: {
                id: id,
                program_id: program_id,
                is_deleted: false,
            }
        });

        if (!record) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Threshold not found or it may be deleted',
                trace_id: traceId,
            });
        }

        reply.send({
            status_code: 200,
            message: 'Fetched successfully',
            trace_id: traceId,
            data: record,
        });
    } catch (error: any) {
        console.error('Error fetching threshold:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching threshold',
            trace_id: traceId
        });
    }
};


export const updateThreshold = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body: ProgramThresholdInput;
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();

    try {
        const { program_id, id } = request.params;
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Token not found',
            });
        }

        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Invalid token',
            });
        }

        const existing = await thresholdConfig.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
            transaction,
        });

        if (!existing) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Threshold not found',
                trace_id: traceId,
            });
        }

        const { module, config, is_enabled } = request.body;

        await existing.update(
            {
                module,
                config,
                is_enabled,
                updated_on: Date.now(),
                updated_by: user?.sub,
            },
            { transaction }
        );

        await transaction.commit();

        reply.send({
            status_code: 200,
            message: 'Threshold updated successfully',
            trace_id: traceId,
            data: existing,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Update failed',
            trace_id: traceId,
        });
    }
};


export const deleteThreshold = async (
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) => {
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

    try {
        const { program_id, id } = request.params;

        const [updated] = await thresholdConfig.update(
            {
                is_deleted: true,
                updated_on: Date.now(),
                updated_by: user?.sub
            },
            {
                where: {
                    id: id,
                    program_id,
                    is_deleted: false,
                },
            }
        );

        if (!updated) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Threshold not found or already deleted',
                trace_id: traceId,
            });
        }

        reply.send({
            status_code: 200,
            message: 'Threshold deleted successfully',
            trace_id: traceId,
        });
    } catch (error: any) {
        console.error('Error during delete operation:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Delete failed',
            trace_id: traceId
        });
    }
};

