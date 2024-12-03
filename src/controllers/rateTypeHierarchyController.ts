import { FastifyRequest, FastifyReply } from "fastify";
import RateTypeHierarchy from "../models/rateTypeHierarchyModel"
import { RateTypeHierarchyData } from "../interfaces/rateTypeHierarchyInterface";
import { baseSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId"

export async function getDataById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
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
                data: data,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: "Rate Type Hierarchy Not Found", data: [] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function createData(data: Omit<RateTypeHierarchyData, "_id">, reply: FastifyReply) {
    try {
        const processedData = {
            ...data
        };
        const newItem: any = await RateTypeHierarchy.create(processedData);
        reply.status(201).send({
            status_code: 201,
            data: newItem?.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        return reply.status(500).send({ message: "Failed To Create Data", error });
    }
}

export async function updateData(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const Data = request.body as RateTypeHierarchyData;
    try {
        const data: RateTypeHierarchy | null = await RateTypeHierarchy.findByPk(id);
        if (data) {
            await data.update(Data);
            reply.status(200).send({
                status_code: 200,
                id: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: "Rate Type Hierarchy Not Found",data:[] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function deleteData(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
        const field = await RateTypeHierarchy.findByPk(id);
        if (field) {
            await field.update({is_deleted:true});
            reply.status(200).send({
                status_code: 200,
                id: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: "Rate Type Hierarchy Not Found",data:[] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function searchData(request: FastifyRequest, reply: FastifyReply) {
  try {
    const searchFields = ["id","program_id","rate_type_id","hierarchy_id","is_enabled","is_deleted"]; 
    const responseFields = ["id","program_id","rate_type_id","hierarchy_id","is_enabled","is_deleted","created_on","modified_on"
    ];
    return await baseSearch(request, reply, RateTypeHierarchy, searchFields, responseFields);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal Server Error' });
  }
}



