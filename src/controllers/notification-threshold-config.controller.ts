import { FastifyRequest, FastifyReply } from 'fastify';
import thresholdConfig from '../models/notification-threshold-config.model';
import { decodeToken } from '../middlewares/verifyToken';

export const createThreshold = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { program_id } = request.params;
        const token = request.headers.authorization?.split(' ')[1];
        const user: any = await decodeToken(token || '');

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
            trace_id: newThreshold.id,
            message: 'Threshold configuration created successfully',
            data: newThreshold,


        });

    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            error: error?.message || error,
        });
    }
};



interface Params {
    program_id: string;
}

export const getAllThresholds = async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply
) => {
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
            data,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching data',
            error: error?.message || error,
        });
    }
};



export const getThresholdById = async (
    request: FastifyRequest<{ Params: { trace_id: string, program_id: string } }>,
    reply: FastifyReply
) => {
    try {
        const token = request.headers.authorization?.split(' ')[1];
        await decodeToken(token || '');

        const { trace_id, program_id } = request.params;

        const record = await thresholdConfig.findOne({
            where: {
                id: trace_id,
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
            data: record,
        });
    } catch (error: any) {
        console.error('Error fetching threshold:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching threshold',
            error: error?.message || error,
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
        Params: { program_id: string; trace_id: string };
        Body: ThresholdUpdateBody;
    }>,
    reply: FastifyReply
) => {
    try {
        const { program_id, trace_id } = request.params;
        const token = request.headers.authorization?.split(' ')[1];
        const user: any = await decodeToken(token || '');

        const existing = await thresholdConfig.findOne({
            where: {
                id: trace_id,
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
            data: existing,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Update failed',
            error: error?.message || error,
        });
    }
};


export const deleteThreshold = async (
    request: FastifyRequest<{ Params: { program_id: string, trace_id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { program_id, trace_id } = request.params;

        const token = request.headers.authorization?.split(' ')[1];
        const user: any = await decodeToken(token || '');

        const existing = await thresholdConfig.findOne({
            where: {
                id: trace_id,
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
            data: existing,
        });
    } catch (error: any) {
        console.error('Error during delete operation:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Delete failed',
            error: error?.message || error,
        });
    }
};
