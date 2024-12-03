import { FastifyRequest, FastifyReply } from "fastify";
import RuleBuilderHierarchyMapping from "../models/rateTypeHierarchyModel"
import { RuleBuilderHierarchyMappingData } from "../interfaces/ruleBuilderHierarchyMappingInterface";
import { baseSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId"

export async function getDataById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
        const data = await RuleBuilderHierarchyMapping.findOne({
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
            reply.status(200).send({ message: "Data not found", data: [] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function createData(data: Omit<RuleBuilderHierarchyMappingData, "_id">, reply: FastifyReply) {
    try {
        const processedData = {
            ...data
        };
        const newItem: any = await RuleBuilderHierarchyMapping.create(processedData);
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
    const Data = request.body as RuleBuilderHierarchyMappingData;
    try {
        const data: RuleBuilderHierarchyMapping | null = await RuleBuilderHierarchyMapping.findByPk(id);
        if (data) {
            await data.update(Data);
            reply.status(200).send({
                status_code: 200,
                id: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: "Data not found",data:[] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function deleteData(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
        const field = await RuleBuilderHierarchyMapping.findByPk(id);
        if (field) {
            await field.update({is_deleted:true});
            reply.status(200).send({
                status_code: 200,
                id: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: "Data not found",data:[] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function searchData(request: FastifyRequest, reply: FastifyReply) {
  try {
    const searchFields = ["id","program_id","rule_id","hierarchy_id","is_enabled","is_deleted"]; 
    const responseFields = ["id","program_id","rule_id","hierarchy_id","is_enabled","is_deleted","created_on","modified_on"
    ];
    return await baseSearch(request, reply, RuleBuilderHierarchyMapping, searchFields, responseFields);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal Server Error' });
  }
}



