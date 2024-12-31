import { FastifyRequest, FastifyReply } from "fastify";
import RateTypeJobTemplate from "../models/rate-type-job-template.model"
import { RateTypeJobTemplateData } from "../interfaces/rate-type-job-template.interface";
import { baseSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId"

export async function getDataById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const traceId=generateCustomUUID();
    try {
        const data = await RateTypeJobTemplate.findOne({
            where: {
                id,
                is_deleted: false,
            }
        });

        if (data) {
            reply.status(200).send({
                status_code: 200,
                data: data,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ message: "Rate Type Job Template Not Found", data: [] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function createData(data: Omit<RateTypeJobTemplateData, "_id">, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const processedData = {
            ...data
        };
        const newItem: any = await RateTypeJobTemplate.create(processedData);
        reply.status(201).send({
            status_code: 201,
            data: newItem?.id,
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({ message: "Failed To Create Data", error });
    }
}

export async function updateData(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const Data = request.body as RateTypeJobTemplateData;
    const traceId=generateCustomUUID();
    try {
        const data: RateTypeJobTemplate | null = await RateTypeJobTemplate.findByPk(id);
        if (data) {
            await data.update(Data);
            reply.status(200).send({
                status_code: 200,
                id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ message: "Rate Type Job Template Not Found",data:[] });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ message: "Internal Server Error" });
    }
}

export async function deleteData(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const traceId=generateCustomUUID();
    try {
        const field = await RateTypeJobTemplate.findByPk(id);
        if (field) {
            await field.update({is_deleted:true});
            reply.status(200).send({
                status_code: 200,
                id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ message: "Rate Type Job Template Not Found",data:[] });
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
    return await baseSearch(request, reply, RateTypeJobTemplate, searchFields, responseFields);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ message: 'Internal Server Error' });
  }
}



