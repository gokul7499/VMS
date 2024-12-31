import { FastifyRequest, FastifyReply } from "fastify";
import RateTypeHierarchy from "../models/rate-type-hierarchy.model"
import { RateTypeHierarchyData } from "../interfaces/rate-type-hierarchy.interface";
import { baseSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId"

export async function getDataById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const traceId = generateCustomUUID();
    try {
        const data = await RateTypeHierarchy.findOne({
            where: {
                id,
                is_deleted: false,
            }
        });

        if (data) {
            reply.status(200).send({
                status_code: 200,
                message: " Rate Type Hierarchy Data Found",
                data: data,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "Rate Type Hierarchy Not Found", data: [], trace_id: traceId });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId });
    }
}

export async function createData(data: Omit<RateTypeHierarchyData, "_id">, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const processedData = {
            ...data
        };
        const newItem: any = await RateTypeHierarchy.create(processedData);
        reply.status(201).send({
            status_code: 201,
            message: "Rate Type Hierarchy Created Successfully",
            data: newItem?.id,
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Failed To Create Data",
            error,
            trace_id: traceId
        });
    }
}

export async function updateData(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const Data = request.body as RateTypeHierarchyData;
    const traceId = generateCustomUUID();
    try {
        const data: RateTypeHierarchy | null = await RateTypeHierarchy.findByPk(id);
        if (data) {
            await data.update(Data);
            reply.status(200).send({
                status_code: 200,
                message: "Rate Type Hierarchy Updated Successfully",
                id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({status_code:200, message: "Rate Type Hierarchy Not Found", data: [] ,trace_id:traceId});
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({status_code:500, message: "Internal Server Error",trace_id:traceId });
    }
}

export async function deleteData(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const traceId = generateCustomUUID();
    try {
        const field = await RateTypeHierarchy.findByPk(id);
        if (field) {
            await field.update({ is_deleted: true });
            reply.status(200).send({
                status_code: 200,
                message: "Rate Type Hierarchy Deleted Successfully",
                id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({status_code:200, message: "Rate Type Hierarchy Not Found", data: [] ,trace_id:traceId});
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({status_code:200, message: "Internal Server Error" ,trace_id:traceId});
    }
}

export async function searchData(request: FastifyRequest, reply: FastifyReply) {
    try {
        const searchFields = ["id", "program_id", "rate_type_id", "hierarchy_id", "is_enabled", "is_deleted"];
        const responseFields = ["id", "program_id", "rate_type_id", "hierarchy_id", "is_enabled", "is_deleted", "created_on", "modified_on"
        ];
        return await baseSearch(request, reply, RateTypeHierarchy, searchFields, responseFields);
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({status_code:500, message: 'Internal Server Error' });
    }
}



