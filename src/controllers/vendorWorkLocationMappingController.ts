import vendorWorkLocationMappingModel from "../models/vendorWorkLocationMappingModel";
import { FastifyRequest, FastifyReply } from "fastify";
import { baseSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId";
import { vendorWorkLocationMappingInterface } from "../interfaces/vendorWorkLocationMappingInterface";

export async function getVendorWorkLocationMappings(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'program_vendor_id', 'labour_category_id', 'vendor_work_location_name', 'is_enabled', 'modified_on'];
    const responseFields = ["id", 'program_id', 'program_vendor_id', 'labour_category_id', 'vendor_work_location_name', 'is_enabled','modified_on'];
    return baseSearch(request, reply, vendorWorkLocationMappingModel, searchFields, responseFields);
}

export async function getVendorWorkLocationMappingById(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params;
        const vendor_work_location_mapping = await vendorWorkLocationMappingModel.findOne({ where: { program_id, id } });
        if (vendor_work_location_mapping) {
            reply.status(200).send({
                status_code: 200,
                message: 'VendorWorkLocationMapping fetch Successfully.',
                trace_id: generateCustomUUID(),
                vendor_work_location_mapping: vendor_work_location_mapping
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'VendorWorkLocationMapping not found.',
                vendor_work_location_mapping: []
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while fetching VendorWorkLocationMapping.',
            trace_id: generateCustomUUID(),
            error: error,
        });
    }
}

export const createVendorWorkLocationMapping = async (request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply) => {
    const vendor_work_location_mapping = request.body as vendorWorkLocationMappingInterface;
    const { program_id } = request.params;
    try {
        const newVendorWorkLocationMapping = await vendorWorkLocationMappingModel.create({ ...vendor_work_location_mapping, program_id });
        reply.status(201).send({
            status_code: 201,
            message: 'VendorWorkLocationMapping created Successfully.',
            trace_id: generateCustomUUID(),
            vendor_work_location_mapping: newVendorWorkLocationMapping
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error: Failed to create VendorWorkLocationMapping',
            trace_id: generateCustomUUID(),
            error: error
        });
    }
};

export async function updateVendorWorkLocationMapping(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const { program_id, id } = request.params;
    try {
        const [updatedCount] = await vendorWorkLocationMappingModel.update(request.body as vendorWorkLocationMappingInterface, { where: { program_id, id } });
        if (updatedCount > 0) {
            reply.send({
                status_code: 201,
                message: 'VendorWorkLocationMapping updated successfully.',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                vendor_work_location_mapping: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'Internal Server error',
            trace_id: generateCustomUUID(),
            error
        });
    }
}

export async function deleteVendorWorkLocationMapping(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params;
        const vendor_work_location_mapping = await vendorWorkLocationMappingModel.findOne({ where: { program_id, id } });
        if (vendor_work_location_mapping) {
            await vendorWorkLocationMappingModel.update({ is_deleted: true, is_enabled: false }, { where: { program_id, id } });
            reply.status(204).send({
                status_code: 204,
                message: 'VendorWorkLocationMapping deleted successfully.',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                vendor_work_location_mapping: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'Internal Server error',
            trace_id: generateCustomUUID(),
            error
        });
    }
}