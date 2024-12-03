import { FastifyRequest, FastifyReply } from 'fastify';
import VendorHierarchyMapping from '../models/vendorHieararchyMappingModel';
import { VendorHierarchyMappingData } from '../interfaces/vendorHieararchyMappingInterface';
import { baseSearch } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';

export const createVendorHierarchyMapping = async (request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply) => {
    try {
        const { hierarchy_name } = request.body as VendorHierarchyMappingData;
        const program_id = request.params.program_id

        const existingMapping = await VendorHierarchyMapping.findOne({
            where: { hierarchy_name }
        });

        if (existingMapping) {
            return reply.status(400).send({
                status_code: 400,
                message: 'A mapping with the same labour category name already exists',
                trace_id: generateCustomUUID(),
            });
        }

        const { ...mappingDataPayload } = request.body as Omit<VendorHierarchyMappingData, 'vendor_hierarchy_mapping_id'>;
        const mappingData: any = await VendorHierarchyMapping.create({ ...mappingDataPayload, program_id });

        reply.status(201).send({
            status_code: 201,
            id: mappingData.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error while creating mapping', error, trace_id: generateCustomUUID() });
    }
};

export const updateVendorHierarchyMapping = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const mappingData = request.body as VendorHierarchyMappingData;
    try {
        const data = await VendorHierarchyMapping.findOne({ where: { id, program_id } });
        if (data) {
            await data.update(mappingData);
            reply.status(201).send({
                status_code: 201,
                mapping: { id: id },
                trace_id: generateCustomUUID(),
                message: 'Mapping updated successfully.',
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                mappingData: [],
            });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An error occurred while updating the mapping', error, trace_id: generateCustomUUID() });
    }
};

export const deleteVendorHierarchyMapping = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const data = await VendorHierarchyMapping.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!data) {
            return reply.status(404).send({ message: 'Mapping data not found' });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            mapping_id: id,
            trace_id: generateCustomUUID(),
            message: 'Mapping deleted successfully'
        });
    } catch (error) {
        reply.status(200).send({
            status_code: 200,
            mappingData: [],
        });
    }
};

export async function getAllVendorHierarchyMappings(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'hierarchy_name'];
    const responseFields = ['id', 'program_id', 'hierarchy_name', 'modified_on'];
    return baseSearch(request, reply, VendorHierarchyMapping, searchFields, responseFields);
}

export async function getVendorHierarchyMappingById(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params;
        const item = await VendorHierarchyMapping.findOne({
            where: { program_id, id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                mapping: item,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                mappingData: [],
            });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An error occurred while fetching mapping data', error });
    }
}
