import { FastifyRequest, FastifyReply } from 'fastify';
import RecipientType from '../models/recipientTypesModel';
import { RecipientTypesData } from '../interfaces/recipientTypesInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createRecipientType = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id } = request.params as { program_id: string };
        const RecipientTypesDataPayload = request.body as Omit<RecipientTypesData, '_id'>;
        const RecipientTypesData: any = await RecipientType.create({ ...RecipientTypesDataPayload, program_id });
        reply.status(201).send({
            status_code: 201,
            Recipient_type: {
                id: RecipientTypesData?.id,
                name: RecipientTypesData?.name,
            },
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error While Creating RecipientType', error, trace_id: generateCustomUUID() });
    }
};

export const updateRecipientType = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const RecipientTypesData = request.body as RecipientTypesData;
    try {
        const data = await RecipientType.findOne({
            where: { id }
        });
        if (data) {
            await data.update(RecipientTypesData);
            reply.status(201).send({
                status_code: 201,
                RecipientType_id: id,
                trace_id: generateCustomUUID(),
                message: 'RecipientType Updated Successfully.',
            });
        } else {
            reply.status(200).send({ message: 'RecipientType Data Not Found.' });
        }
    } catch (error) {
        reply.status(500).send({ message: ' An Error Occurred While Updating The RecipientType', error, trace_id: generateCustomUUID() });
    }
}

export const deleteRecipientType = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = request.params as { id: string };
        const data = await RecipientType.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'RecipientType Data Not Found' });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            Recipient_type_id: id,
            trace_id: generateCustomUUID(),
            message: 'RecipientType Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error Deleting RecipientType Data', error, trace_id: generateCustomUUID() });
    }
}

export async function getAllRecipientTypes(
    request: FastifyRequest<{ Params: RecipientTypesData, Querystring: RecipientTypesData }>,
    reply: FastifyReply
) {
    try {
        const query: any = request.query;

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
            query.is_enabled == "false" ? searchConditions.is_enabled = false : searchConditions.is_enabled = true;
        }
        const { rows: Receipient_type, count } = await RecipientType.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["name", "ASC"]],
            offset: offset,
        });
        if (Receipient_type.length === 0) {
            return reply.status(200).send({
                message: "RecipientType Not Found",
                Recipient_type: []
            });
        }
        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            Receipient_type: Receipient_type,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: "Internal Server error",
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
}

export async function getRecipientTypes(
    request: FastifyRequest<{ Params: RecipientTypesData, Querystring: RecipientTypesData }>,
    reply: FastifyReply
) {
    try {
        const query: any = request.query;

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
            query.is_enabled == "false" ? searchConditions.is_enabled = false : searchConditions.is_enabled = true;
        }
        const { rows: Receipient_type, count } = await RecipientType.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (Receipient_type.length === 0) {
            return reply.status(200).send({
                message: "RecipientType Not Found",
                Recipient_type: []
            });
        }
        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            Receipient_type: Receipient_type,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: "Internal Server error",
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
}

export async function getRecipientTypeById(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as { id: string };
        const item = await RecipientType.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                Receipient_type: item,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'RecipientType Data Not Found', workflow: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching RecipientType Data.', error });
    }
}
