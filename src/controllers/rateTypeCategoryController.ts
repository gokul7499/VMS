import { FastifyRequest, FastifyReply } from 'fastify';
import RateTypeCategory from '../models/rateTypeCategoryModel';
import { RateTypeCategoryData } from '../interfaces/rateTypeCategoryInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createRateTypeCategory = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const RateTypeCategoryPayload = request.body as Omit<RateTypeCategoryData, '_id'>;
        const RateTypeCategoryData: any = await RateTypeCategory.create(RateTypeCategoryPayload);
        reply.status(201).send({
            status_code: 201,
            rate_type_category_id: RateTypeCategoryData?.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error While Creating Rate Type Category',
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
};

export const updateRateTypeCategory = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const RateTypeCategoryData = request.body as RateTypeCategoryData;
    try {
        const data = await RateTypeCategory.findOne({
            where: { id, is_deleted: false },
        });
        if (!data) {
            return reply.status(200).send({ message: 'Rate Type Category Not Found.' });
        }
        const UpdatedRateTypeCategory = await data.update(RateTypeCategoryData);

        if (UpdatedRateTypeCategory) {
            reply.send({ success: true, message: 'Rate Type Category Updated Successfully.' });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Updating The Rate Type Category', error, trace_id: generateCustomUUID() });
    }
}

export const deleteRateTypeCategory = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = request.params as { id: string };
        const data = await RateTypeCategory.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'Rate Type Category Data Not Found' });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            rate_type_category_id: id,
            trace_id: generateCustomUUID(),
            message: 'Rate Type Category Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error Deleting Rate Type Category', error, trace_id: generateCustomUUID() });
    }
}

export async function getAllRateTypeCategory(
    request: FastifyRequest<{ Params: RateTypeCategoryData, Querystring: RateTypeCategoryData }>,
    reply: FastifyReply
) {
    try {
        const query: any = request.query as RateTypeCategoryData;

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

        const { rows: rateTypeCategory, count } = await RateTypeCategory.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (rateTypeCategory.length === 0) {
            return reply.status(200).send({
                message: "Rate Type Category Not Found",
                rate_type_category: []
            });
        }

        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            rate_type_category: rateTypeCategory,
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

export async function getRateTypeCategoryById(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as { id: string };
        const item = await RateTypeCategory.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                rate_type_category: item,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'Rate Type Category Not Found', rate_type_category: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching Rate Type Category', error });
    }
}
