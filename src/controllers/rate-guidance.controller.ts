import { FastifyRequest, FastifyReply } from 'fastify';
import RateGuidance from '../models/rate-guidance.model';
import { RateGuidanceData } from '../interfaces/rate-guidance.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/instance';
import { logger } from '../utility/loggerService';

export const createRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };

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
        const rateGuidanceData = {
            ...request.body as RateGuidanceData,
            program_id,
            created_by: userId,
            updated_by: userId,
        };

        const newRateGuidance = await RateGuidance.create(rateGuidanceData);

        reply.status(201).send({
            status_code: 201,
            message: 'Rate guidance created successfully',
            rate_guidance_id: newRateGuidance.id,
            trace_id: traceId
        });
    } catch (error: any) {
        logger.error('Error in createRateGuidance:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error creating rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const updateRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string; id: string };

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
        const rateGuidance = await RateGuidance.findOne({
            where: { id, program_id, is_deleted: false }
        });

        if (!rateGuidance) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Rate guidance not found',
                trace_id: traceId
            });
        }

        const updateData = {
            ...request.body as RateGuidanceData,
            updated_by: userId,
            updated_on: new Date()
        };

        await rateGuidance.update(updateData);

        reply.status(200).send({
            status_code: 200,
            message: 'Rate guidance updated successfully',
            rate_guidance_id: id,
            trace_id: traceId
        });
    } catch (error: any) {
        logger.error('Error in updateRateGuidance:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const deleteRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string; id: string };

    try {
        const rateGuidance = await RateGuidance.findOne({
            where: { id, program_id, is_deleted: false }
        });

        if (!rateGuidance) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Rate guidance not found',
                trace_id: traceId
            });
        }

        await rateGuidance.update({
            is_deleted: true,
            is_enabled: false
        });

        reply.status(200).send({
            status_code: 200,
            message: 'Rate guidance deleted successfully',
            rate_guidance_id: id,
            trace_id: traceId
        });
    } catch (error: any) {
        logger.error('Error in deleteRateGuidance:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const getRateGuidanceById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string; id: string };

    try {
        const rateGuidance = await RateGuidance.findOne({
            where: { id, program_id, is_deleted: false }
        });

        if (!rateGuidance) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Rate guidance not found',
                trace_id: traceId
            });
        }

        reply.status(200).send({
            status_code: 200,
            rate_guidance: rateGuidance,
            trace_id: traceId
        });
    } catch (error: any) {
        logger.error('Error in getRateGuidanceById:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error retrieving rate guidance',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const getAllRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const { page = 1, limit = 10, search, is_enabled } = request.query as { page: number; limit: number; search?: string; is_enabled?: boolean };

    try {
        const offset = (page - 1) * limit;
        const whereClause: any = {
            program_id,
            is_deleted: false,
        };

        if (is_enabled !== undefined) {
            whereClause.is_enabled = is_enabled;
        }

        if (search) {
            whereClause[Op.or] = [
                { industry: { [Op.like]: `%${search}%` } },
                { profession: { [Op.like]: `%${search}%` } },
                { specialty: { [Op.like]: `%${search}%` } },
                { state: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await RateGuidance.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['created_on', 'DESC']]
        });

        reply.status(200).send({
            status_code: 200,
            total: count,
            page,
            limit,
            rate_guidance: rows,
            trace_id: traceId
        });
    } catch (error: any) {
        logger.error('Error in getAllRateGuidance:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error retrieving rate guidance data',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const advancedSearchRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const {
        industry,
        profession,
        specialty,
        state,
        regular_bill_rate_min,
        regular_bill_rate_max,
        is_enabled,
        page = 1,
        limit = 10
    } = request.body as any;

    try {
        const offset = (page - 1) * limit;
        const whereClause: any = {
            program_id,
            is_deleted: false,
        };

        if (industry) whereClause.industry = { [Op.like]: `%${industry}%` };
        if (profession) whereClause.profession = { [Op.like]: `%${profession}%` };
        if (specialty) whereClause.specialty = { [Op.like]: `%${specialty}%` };
        if (state) whereClause.state = { [Op.like]: `%${state}%` };
        if (is_enabled !== undefined) whereClause.is_enabled = is_enabled;
        if (regular_bill_rate_min !== undefined || regular_bill_rate_max !== undefined) {
            whereClause.regular_bill_rate = {};
            if (regular_bill_rate_min !== undefined) whereClause.regular_bill_rate[Op.gte] = regular_bill_rate_min;
            if (regular_bill_rate_max !== undefined) whereClause.regular_bill_rate[Op.lte] = regular_bill_rate_max;
        }

        const { count, rows } = await RateGuidance.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['created_on', 'DESC']]
        });

        reply.status(200).send({
            status_code: 200,
            total: count,
            page,
            limit,
            rate_guidance: rows,
            trace_id: traceId
        });
    } catch (error: any) {
        logger.error('Error in advancedSearchRateGuidance:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error in advanced search',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const bulkUploadRateGuidance = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const { records } = request.body as { records: Array<{
        industry: string;
        profession: string;
        specialty: string;
        state: string;
        regular_bill_rate: number;
    }> };

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
        // Validate and transform records
        const rateGuidanceRecords = records.map(record => ({
            program_id,
            industry: record.industry,
            profession: record.profession,
            specialty: record.specialty,
            state: record.state,
            regular_bill_rate: parseFloat(record.regular_bill_rate),
            created_by: userId,
            updated_by: userId
        }));

        // Bulk create records
        await RateGuidance.bulkCreate(rateGuidanceRecords);

        reply.status(201).send({
            status_code: 201,
            message: `Successfully uploaded ${rateGuidanceRecords.length} rate guidance records`,
            trace_id: traceId
        });
    } catch (error: any) {
        logger.error('Error in bulkUploadRateGuidance:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error processing bulk upload',
            error: error.message,
            trace_id: traceId
        });
    }
};
