import { FastifyRequest, FastifyReply } from "fastify";
import { VendorDocumentGroup } from "../interfaces/vendor-document-group.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import vendordocumentgroupModel from "../models/vendor-document-group.model";
import { logger } from '../utility/loggerService';
import VendorDocumentGroupService from "../service/vendor-document-group.service";

const vendorDocumentGroupService = new VendorDocumentGroupService();

export async function createVendordocumentsgroup(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const vendorDocumentsGroup = request.body as VendorDocumentGroup;
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;

    try {
        const result = await vendorDocumentGroupService.createVendorDocumentGroup(
            vendorDocumentsGroup,
            program_id,
            userId
        );

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "creating vendor documents group",
                status: "success",
                description: `Creating vendor documents group for ${program_id}`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendordocumentgroupModel
        );

        reply.status(201).send({
            status_code: 201,
            message: result.message,
            vendor_documents_group_id: result.vendor_documents_group_id,
            trace_id: traceId
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "created vendor documents group",
                status: "success",
                description: `Created vendor documents group for ${program_id} successfully: ${result.vendor_documents_group_id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendordocumentgroupModel
        );
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "creating vendor documents group",
                status: "error",
                description: `Error creating vendor documents group for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendordocumentgroupModel
        );

        const statusCode = error.message.includes('already exists') ? 409 : 500;
        reply.status(statusCode).send({
            status_code: statusCode,
            message: error.message || "Internal Server Error",
            trace_id: traceId,
        });
    }
}

export async function getVendorDocumentsGroupByIdAndDoc(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id, required_documents } = request.params as { 
            id: string; 
            program_id: string; 
            required_documents: string 
        };

        const result = await vendorDocumentGroupService.getVendorDocumentGroupByIdAndDoc(
            id,
            program_id,
            required_documents
        );

        if (result) {
            reply.status(200).send({
                status_code: 200,
                message: result.message,
                vendorDocumentsGroup: result.vendorDocumentsGroup,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ 
                status_code: 200, 
                message: "Vendor documents group not found", 
                trace_id: traceId 
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while fetching vendor documents group.",
            error,
            trace_id: traceId,
        });
    }
}

export async function getVendordocumentsgroup(
    request: FastifyRequest<{ Params: VendorDocumentGroup; Querystring: VendorDocumentGroup }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params as VendorDocumentGroup;
        const query = request.query as VendorDocumentGroup | any;

        const result = await vendorDocumentGroupService.getVendorDocumentGroups(params, query);

        reply.status(200).send({
            status_code: 200,
            message: result.message,
            items_per_page: result.items_per_page,
            total_records: result.total_records,
            vendorDocumentsGroup: result.vendorDocumentsGroup,
            trace_id: traceId,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getVendordocumentsgroupId(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        
        const result = await vendorDocumentGroupService.getVendorDocumentGroupById(program_id, id);

        reply.status(201).send({
            status_code: 201,
            message: result.message,
            vendorDocumentsGroup: result.vendorDocumentsGroup,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function updateVendordocumentsgroup(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id, id } = request.params as { id: string; program_id: string };
    const documentGroupData = request.body as Partial<VendorDocumentGroup>;
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;

    try {
        const result = await vendorDocumentGroupService.updateVendorDocumentGroup(
            id,
            program_id,
            documentGroupData,
            userId
        );

        return reply.status(200).send({
            status_code: 200,
            message: result.message,
            trace_id: traceId,
        });
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 
                          error.message.includes('already exists') ? 400 : 500;
        
        return reply.status(statusCode).send({
            status_code: statusCode,
            message: error.message || 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function deleteVendordocumentsgroup(request: FastifyRequest, reply: FastifyReply) {
    const user = request?.user;
    const userId = user?.sub;
    const traceId = generateCustomUUID();
    
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        
        const result = await vendorDocumentGroupService.deleteVendorDocumentGroup(id, program_id, userId);

        if (result.vendor_documents_group_id) {
            reply.status(204).send({
                status_code: 204,
                message: result.message,
                vendor_documents_group_id: result.vendor_documents_group_id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: result.message,
                vendor_documents_group: result.vendor_documents_group,
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
}

export async function getAllVendorCompDocummentGroupByProgramId(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'id', 'is_enabled', 'description', 'total_documents', 'name'];
    const responseFields = ['id', 'name', 'description', 'total_documents', 'updated_on', 'is_enabled', 'program_id'];
    return baseSearch(request, reply, vendordocumentgroupModel, searchFields, responseFields);
}

export async function vendorDocumentGroupFilter(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const filters = request.body as {
            id: string;
            name: string;
            description: string;
            is_enabled: string;
            updated_on: any;
            page: string;
            limit: string;
        };

        const result = await vendorDocumentGroupService.filterVendorDocumentGroups(program_id, filters);

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: result.message,
            total_records: result.total_records,
            page: result.page,
            limit: result.limit,
            vendor_documents_group: result.vendor_documents_group,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}