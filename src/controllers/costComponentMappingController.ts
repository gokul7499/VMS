import { FastifyRequest, FastifyReply } from 'fastify';
import costComponentMapping from '../models/costComponentMappingModel';
import { costComponentMappingData } from '../interfaces/costComponentMappingInterface';
import { baseSearch } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';

export const createCostComponentMapping = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const costComponentMappingPayload = request.body as Omit<costComponentMappingData, '_id'>;
        const costComponentMappingData: any = await costComponentMapping.create(costComponentMappingPayload);
        reply.status(201).send({
            status_code: 201,
            costComponentGroup: {
                id: costComponentMappingData?.id,
                name: costComponentMappingData?.name,
            },
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error while creating costComponentMapping', error, trace_id: generateCustomUUID() });
    }
};

export async function getAllCostComponentMapping(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['id', 'program_id'];
    const responseFields = ['id', 'program_id', 'cost_component_id'];
    return baseSearch(request, reply, costComponentMapping, searchFields, responseFields);
}
