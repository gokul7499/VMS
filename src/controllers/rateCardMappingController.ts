import { FastifyRequest, FastifyReply } from 'fastify';
import RateCardMappingModel from '../models/RateCardMappingModel';
import { RateCardMappingData } from '../interfaces/rateCardMappingInterdface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createRateCardMapping = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id } = request.params as { program_id: string };
        const RateCardMappingPayload = request.body as Omit<RateCardMappingData, '_id'>;
        const RateCardMappingData: any = await RateCardMappingModel.create({ ...RateCardMappingPayload, program_id });
        reply.status(201).send({
            status_code: 201,
            rate_card_mapping: RateCardMappingData?.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error While Creating Rate Card Mapping', error, trace_id: generateCustomUUID() });
    }
};

export const updateRateCardMapping = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const RateCardMappingData = request.body as RateCardMappingData;
    try {
        const data = await RateCardMappingModel.findOne({
            where: { id, is_deleted: false, program_id }
        });
        if (data) {
            await data.update(RateCardMappingData);
            reply.status(201).send({
                status_code: 201,
                rate_card_mapping_id: id,
                trace_id: generateCustomUUID(),
                message: 'Rate Card Mapping Updated Successfully.',
            });
        } else {
            reply.status(200).send({ message: 'Rate Card Mapping Data Not Found.' });
        }
    } catch (error) {
        reply.status(500).send({ message: ' An Error Occurred While Updating The Rate Card Mapping.', error, trace_id: generateCustomUUID() });
    }
}

export const deleteRateCardMapping = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = await RateCardMappingModel.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'Rate Card Mapping Data Not Found' });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            rate_card_mapping_id: id,
            trace_id: generateCustomUUID(),
            message: 'Rate Card Mapping Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error Deleting Rate Card Mapping Data', error, trace_id: generateCustomUUID() });
    }
}

export async function getAllRateCardMappings(
    request: FastifyRequest<{ Params: RateCardMappingData, Querystring: RateCardMappingData }>,
    reply: FastifyReply
) {
    try {
        const params = request.params as RateCardMappingData;
        const query: any = request.query as RateCardMappingData;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        if (query.is_enabled) {
            searchConditions.is_enabled = query.is_enabled;
        }
        const { rows: rate_card_mapping, count } = await RateCardMappingModel.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false, program_id: params.program_id },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (rate_card_mapping.length === 0) {
            return reply.status(200).send({
                message: "Rate Card Mapping Not Found",
                rate_card_mapping: []
            });
        }
        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            rate_card_mapping: rate_card_mapping,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
}

export async function getRateCardMappingById(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await RateCardMappingModel.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                rate_card_mapping: item,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'Rate Card Mapping Data Not Found', Rate_card_mapping: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching Rate Card Mapping Data.', error });
    }
}
