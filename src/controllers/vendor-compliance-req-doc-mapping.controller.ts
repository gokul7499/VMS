import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
import {VendorComplianceReqDocMappingInterface } from '../interfaces/vendor-compliance-req-doc-mapping.interface';
import { baseSearch } from "../utility/baseService";

export async function createVendorComplianceReqDoc(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const vendorComplianceMapping = request.body as VendorComplianceReqDocMappingInterface;
    try {
        const vendorComplianceMappingData: any = await VendorComplianceReqDocMappingModel.create({
            ...vendorComplianceMapping,
        });
 
        return reply.status(201).send({
            status_code: 201,
            message: 'Vendor compliance req doc mapping created successfully',
            vendor_compliance_mapping: vendorComplianceMappingData.id,
            trace_id:traceId
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            trace_id:traceId,
            message: 'Failed To Create Vendor Labour Categories'
        });
    }
}

export async function getAllVendorComplianceReqDoc(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['id','program_id','vendor_id','document_group_id', 'is_enabled','modified_on'];
    const responseFields = ['id','program_id','vendor_id','document_group_id', 'is_enabled','modified_on'];
    return baseSearch(request, reply, VendorComplianceReqDocMappingModel, searchFields, responseFields);
}

export async function getVendorComplianceReqDocById(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params;
        const vendorComplianceMapping = await VendorComplianceReqDocMappingModel.findOne({ where: { program_id, id, is_deleted: false } });
        if (vendorComplianceMapping) {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor compliance req doc mapping fetched successfully.',
                trace_id:traceId,
                vendor_compliance_mapping :vendorComplianceMapping,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor compliance req doc mapping not found.',
                trace_id:traceId,
                vendor_compliance_mapping : [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching vendor compliance req doc mapping .',
            trace_id:traceId,
        });
    }
}
 

export async function updateVendorComplianceReqDoc(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const { program_id, id } = request.params;
    const traceId = generateCustomUUID();
    try {
        const [updatedCount] = await VendorComplianceReqDocMappingModel.update(request.body as VendorComplianceReqDocMappingInterface, {
            where: { program_id, id, is_deleted: false },
        });
        if (updatedCount > 0) {
            reply.send({
                status_code: 201,
                message: 'Vendor compliance req doc mapping updated successfully.',
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id:traceId,
                message: 'Vendor compliance req doc mapping not found',
                vendor_compliance_mapping : [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server error',
            trace_id:traceId,
        });
    }
}
 
export async function deleteVendorComplianceReqDoc(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params;
        const vendorComplianceMapping = await VendorComplianceReqDocMappingModel.findOne({
            where: { program_id, id, is_deleted: false },
        });
        if (vendorComplianceMapping) {
            await VendorComplianceReqDocMappingModel.update(
                { is_deleted: true, is_enabled: false },
                { where: { program_id, id } }
            );
            reply.status(204).send({
                status_code: 204,
                message: 'Vendor compliance req doc mapping deleted successfully.',
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor compliance req doc mapping not found',
                trace_id:traceId,
                vendor_compliance_mapping : [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting vendor compliance req doc mapping.',
            trace_id:traceId,
        });
    }
}
