import VendorComplianceDocumentModel from "../models/vendor-compliance-document.model";
import { VendorComplianceDocumentInterface } from "../interfaces/vendor-compliance-document.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import { baseSearch, BaseService } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId";
import WorkLocationModel from "../models/work-location.model";
import { logger } from "../utility/loggerService";
import { decodeToken } from "../middlewares/verifyToken";
import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
const baseService = new BaseService(VendorComplianceDocumentModel);

const vendorComplianceDocumentService = new BaseService(VendorComplianceDocumentModel);

export async function createVendorComplianceDocument(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { program_id } = request.params as { program_id: string };
  const vendor_comp_doc = request.body as VendorComplianceDocumentInterface;

  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply
      .status(401)
      .send({status_code:401, message: "Unauthorized - Token not found", trace_id: traceId });
  }

  const token = authHeader.split(" ")[1];
  let user: any = await decodeToken(token);


  if (!user) {
    return reply.status(401).send({status_code:401, message: "Unauthorized - Invalid token", trace_id: traceId });
  }
  const userId=user?.sub
  logger(
    {
      traceId,
      actor: {
        user_name: user?.preferred_username,
        user_id: userId,
      },
      data: request.body,
      eventname: "create vendor compliance document",
      status: "error",
      description: `Program id is required for creating vendor compliance document`,
      level: "error",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    },
    VendorComplianceDocumentModel
  );

  if (!program_id) {
    return reply.status(400).send({
      status_code: 400,
      message: "Program id is required.",
      trace_id: traceId,
    });
  }

  try {
    const existingDocument = await VendorComplianceDocumentModel.findOne({
      where: {
        program_id,
        name: vendor_comp_doc.name,
      },
    });

    if (existingDocument) {
      return reply.status(409).send({
        status_code: 409,
        message: "A document with the same name already exists for this program.",
        trace_id: traceId,
      });
    }

    const vendor_comp_document = await VendorComplianceDocumentModel.create({
      ...vendor_comp_doc,
      program_id,
      created_by: userId,
      updated_by: userId,
    });
    logger(
      {
        traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating vendor compliance document",
        status: "success",
        description: `Vendor compliance document created successfully for ${program_id}: ${vendor_comp_document?.id}`,
        level: "success",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      VendorComplianceDocumentModel
    );

    reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: "Vendor compliance documents created successfully",
      compliance_documents: vendor_comp_document?.id,
    });
  } catch (error: any) {
    logger(
      {
        traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor compliance document",
        status: "error",
        description: `Error creating vendor compliance document for ${program_id}`,
        level: "error",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      VendorComplianceDocumentModel
    );

    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
    });
  }
}

export async function vendorComplianceDocumentById(
  request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
  reply: FastifyReply
) {
  const { program_id, id } = request.params;
  const traceId = generateCustomUUID();

  try {

    const searchFields = { program_id, id };
    const vendorCompDocument = await vendorComplianceDocumentService.getByIdAndPopulate(
      request,
      searchFields
    );

    if (!vendorCompDocument) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Compliance document not found",
        compliance_documents: [],
      });
    }

    const vendorCompDocumentData = vendorCompDocument.toJSON();
    const workLocationIds = vendorCompDocumentData.work_locations || [];

    const workLocations = await WorkLocationModel.findAll({
      where: { id: workLocationIds },
      attributes: ["id", "name"],
    });

    const workLocationData = workLocations.map((location) => ({
      id: location.id,
      name: location.name,
    }));

    const response = {
      ...vendorCompDocumentData,
      work_locations: workLocationData,
    };

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Compliance document retrieved successfully",
      compliance_documents: response,
    });
  } catch (error) {
    console.error("Error fetching compliance document:", error);
    return reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching compliance document",
      trace_id: traceId,
    });
  }
}

export async function updateVendorComplianceDocumentById(
  request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
  reply: FastifyReply
) {
  const { id, program_id } = request.params;
  const vendorDocuments = request.body as Partial<VendorComplianceDocumentInterface>;
  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId=user?.sub

  try {
    const existingDocument = await vendorComplianceDocumentService.getByIdAndPopulate(
      request,
      { program_id, id }
    );

    if (!existingDocument) {
      return reply.status(200).send({
        status_code: 200,
        message: "Vendor compliance documents not found for update.",
        trace_id: traceId,
        compliance_documents: []
      });
    }

    await vendorComplianceDocumentService.updateById(request, { program_id, id,updated_by:userId, });

    if (vendorDocuments.uploaded_document && Array.isArray(vendorDocuments.uploaded_document)) {
      for (const doc of vendorDocuments.uploaded_document) {
        await VendorComplianceReqDocMappingModel.upsert({
          id: doc.id,
          program_id,
          ...doc,
          is_enabled: true,
          is_deleted: false,
        });
      }
    }

    reply.status(200).send({
      status_code: 200,
      message: "Vendor compliance documents updated successfully",
      trace_id: traceId,
    });
  } catch (error) {
    console.error("Error updating vendor compliance documents:", error);
    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
    });
  }
}

export async function deleteVendorComplianceDocumentById(
  request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId=user?.sub
  try {
    const { program_id, id } = request.params;

    const deletedCount = await vendorComplianceDocumentService.deleteById({ program_id, id ,updated_by:userId,});

    if (deletedCount > 0) {
      reply.status(200).send({
        status_code: 200,
        message: "Vendor compliance documents deleted successfully",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Vendor compliance documents not found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    console.error("Error deleting vendor compliance documents:", error);
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while deleting vendor compliance documents",
      trace_id: traceId,
    });
  }
}

export async function getAllVendorCompDocummentByProgramId(
  request: FastifyRequest<{
    Params: { program_id: string },
    Querystring: {
      page?: number;
      limit?: number;
      name?: string;
      is_enabled?: string;
      document_details?: string;
      updated_on?: number;
    }
  }>,
  reply: FastifyReply
) {
  const { program_id } = request.params;
  const { page = 1, limit = 10, name, is_enabled, document_details, updated_on } = request.query;

  const query = {
    program_id,
    name,
    is_enabled,
    document_details,
    updated_on
  };

  const responseFields = ['id', 'name', 'document_details', 'updated_on', 'is_enabled', 'program_id'];
  const traceId = generateCustomUUID();
  try {
    const result = await baseService.getAllByCriteriaPopulate(
      request,
      query,
      { page: Number(page), limit: Number(limit) },
      responseFields
    );

    if (result.count > 0) {
      return reply.status(200).send({
        status_code: 200,
        total_records: result.count,
        page: Number(page),
        limit: Number(limit),
        compliance_documents: result.rows,
        message:" Vendor Compliance Documents Retrieved Successfully",
        trace_id: traceId
      });
    } else {
      return reply.status(200).send({ status_code: 200, message: "No records found",trace_id:traceId  });
    }
  } catch (error) {
    return reply.status(500).send({ status_code: 500, message: "Internal Server Error",trace_id:traceId  });
  }
}

