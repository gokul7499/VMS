import { FastifyRequest, FastifyReply } from 'fastify';
import thresholdConfig from '../models/notification-threshold-config.model';
import { decodeToken } from '../middlewares/verifyToken';
import { trace } from 'console';
import generateCustomUUID from '../utility/genrateTraceId';

export const createThreshold = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
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

        const { module, config } = request.body as {
            module: string;
            config: any[];
        };

        const timestamp = Date.now();

        const newThreshold = await thresholdConfig.create({
            program_id,
            module,
            config,
            is_enabled: true,
            is_deleted: false,
            created_on: timestamp,
            updated_on: timestamp,
            created_by: user?.sub,
            updated_by: user?.sub,
        });

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: newThreshold.id,
            message: 'Threshold configuration created successfully',


        });

    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            error: error?.message || error,
            trace_id: traceId
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

    const userId = user?.sub;
    try {
        const token = request.headers.authorization?.split(' ')[1];
        await decodeToken(token || '');

        const { program_id } = request.params;

        const data = await thresholdConfig.findAll({
            where: {
                is_deleted: false,
                program_id,
            },
        });

        if (data.length === 0) {
            return reply.status(404).send({
                status_code: 404,
                message: 'No threshold data found for this program',
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
            error: error?.message || error,
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

    const userId = user?.sub;
    try {
        const token = request.headers.authorization?.split(' ')[1];
        await decodeToken(token || '');

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
            error: error?.message || error,
            trace_id: traceId

        });
    }
};


type ThresholdUpdateBody = {
    module: string;
    config: any[];
    is_enabled: boolean;
};

export const updateThreshold = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body: ThresholdUpdateBody;
    }>,
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

    const userId = user?.sub;
    try {
        const { program_id, id } = request.params;
        const token = request.headers.authorization?.split(' ')[1];
        const user: any = await decodeToken(token || '');

        const existing = await thresholdConfig.findOne({
            where: {
                id: id,
                program_id,
                is_deleted: false,
            },
        });

        if (!existing) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Threshold not found',
            });
        }

        const { module, config, is_enabled } = request.body;

        await existing.update({
            module,
            config,
            is_enabled,
            updated_on: Date.now(),
            updated_by: user?.sub,
        });

        reply.send({
            status_code: 200,
            message: 'Threshold updated successfully',
            trace_id: traceId,
            data: existing,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Update failed',
            error: error?.message || error,
            trace_id: traceId

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

    const userId = user?.sub;
    try {
        const { program_id, id } = request.params;
        const token = request.headers.authorization?.split(' ')[1];
        const user: any = await decodeToken(token || '');

        const existing = await thresholdConfig.findOne({
            where: {
                id: id,
                program_id,
                is_deleted: false,
            }
        });

        if (!existing) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Threshold not found or already deleted',
            });
        }

        await existing.update({
            is_deleted: true,
            updated_on: Date.now(),
            updated_by: user?.sub,
        });

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
            error: error?.message || error,
            trace_id: traceId

        });
    }
};
