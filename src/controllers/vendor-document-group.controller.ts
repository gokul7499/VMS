import { FastifyRequest, FastifyReply } from "fastify";
import { VendorDocumentGroup } from "../interfaces/vendor-document-group.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";
import { baseSearch } from "../utility/baseService";
import vendordocumentgroupModel from "../models/vendor-document-group.model";
import vendorComplianceDocumentModel from "../models/vendor-compliance-document.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export async function createVendordocumentsgroup(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const vendorDocumentsGroup = request.body as VendorDocumentGroup;
    const { program_id, required_documents } = vendorDocumentsGroup;
    const trace_id = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }

    try {
        const existingDocument = await vendordocumentgroupModel.findOne({
            where: {
                name: vendorDocumentsGroup.name,
                program_id,
            },
        });

        if (existingDocument) {
            return reply.status(409).send({
                status_code: 409,
                message: 'This vendor document group already exists',
                trace_id,
            });
        }
        const total_documents = Array.isArray(required_documents) ? required_documents.length : 0;

        const item = await vendordocumentgroupModel.create({ ...vendorDocumentsGroup ,total_documents});

        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
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
            vendor_documents_group_id: item.id,
            trace_id
        });

        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created vendor documents group",
                status: "success",
                description: `Created vendor documents group for ${program_id} successfully: ${item.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendordocumentgroupModel
        );
    } catch (error) {
        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
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

        reply.status(500).send({
            message: "Internal Server Error",
            error,
            trace_id: trace_id ,
        });
    }
}

export async function getVendorDocumentsGroupByIdAndDoc(
    request: FastifyRequest<{ Params: { id: string; program_id: string; required_documents?: string } }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const { id, program_id, required_documents } = request.params;

        const query: any = {
            where: {
                id,
                program_id,
                is_deleted: false
            },
            attributes: { exclude: ["ref_id", "entity_ref", "code", "program_id", "created_on"] }
        };

        if (required_documents) {
            query.where.required_documents = required_documents;
        }
        const vendorDocumentsGroup = await vendordocumentgroupModel.findOne(query);

        if (vendorDocumentsGroup) {
            reply.status(200).send({
                status_code: 200,
                vendorDocumentsGroup,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({ message: "Vendor documents group not found" });
        }
    } catch (error) {
        reply.status(500).send({
            message: "An error occurred while fetching vendor documents group.",
            error,
            trace_id:traceId,
        });
    }
}

export async function getVendordocumentsgroup(
    request: FastifyRequest<{ Params: VendorDocumentGroup; Querystring: VendorDocumentGroup }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const params = request.params as VendorDocumentGroup;
        const query = request.query as VendorDocumentGroup | any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;
        query.is_enabled = true;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        if (query.entity_ref) {
            searchConditions.entity_ref = { [Op.like]: `%${query.entity_ref}%` };
        }

        const count = await vendordocumentgroupModel.count({
            where: {
                ...query,
                program_id: params.program_id,
                ...searchConditions,
                is_deleted: false,
            },
        });

        const vendorDocumentsGroup = await vendordocumentgroupModel.findAll({
            where: {
                ...query,
                program_id: params.program_id,
                ...searchConditions,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id", "program_id", "modified_by", "created_by"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (vendorDocumentsGroup.length === 0) {
            return reply.status(200).send({ message: "Vendor documents group not found", vendorDocumentsGroup: [] });
        }

        const vendorDocumentsGroupWithCount = vendorDocumentsGroup.map(group => {
            return {
                ...group.toJSON(),
                total_documents: group.required_documents.length,
            };
        });

        reply.status(200).send({
            status_code: 200,
            items_per_page: limit,
            total_records: count,
            vendorDocumentsGroup: vendorDocumentsGroupWithCount,
            trace_id:traceId,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server error",
            error: error,
            trace_id:traceId,
        });
    }
}

export async function getVendordocumentsgroupId(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const { program_id, id } = request.params;
        const vendorDocumentsGroup = await vendordocumentgroupModel.findOne(
            {
                where: { program_id, id }
            }
        );

        if (!vendorDocumentsGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: "Vendor documents group not found",
                vendor_documents_group: [],
            });
        }

        const required_documents_ids = vendorDocumentsGroup?.dataValues.required_documents || [];
        if (required_documents_ids.length === 0) {
            throw new Error("Required documents not found.");
        }

        const required_documents = await vendorComplianceDocumentModel.findAll({
            where: { id: required_documents_ids },
            attributes: ['id', 'name']
        });

        reply.status(201).send({
            status_code: 201,
            vendorDocumentsGroup: {
                ...vendorDocumentsGroup.dataValues,
                required_documents
            },
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            message: "Internal Server Error",
            trace_id:traceId,
            error,
        });
    }
}

export async function updateVendordocumentsgroup(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const { program_id, id } = request.params as { id: string; program_id: string };
    const documentGroupData = request.body as Partial<VendorDocumentGroup>;
    const { required_documents, name } = documentGroupData;
    const traceId = generateCustomUUID();
  
    try {
      const documentGroup = await vendordocumentgroupModel.findOne({
        where: {
          id,
          program_id,
          is_deleted: false, 
        },
      });
  
      if (!documentGroup) {
        return reply.status(404).send({
          status_code: 404,
          message: 'Document group not found',
          trace_id: traceId,
        });
      }
  
      if (name) {
        const existingGroupWithName = await vendordocumentgroupModel.findOne({
          where: {
            name,
            program_id,
            is_deleted: false,
            id: { [Op.ne]: id }, 
          },
        });
  
        if (existingGroupWithName) {
          return reply.status(400).send({
            status_code: 400,
            message: 'A document group with the same name already exists',
            trace_id: traceId,
          });
        }
      }
  
      let total_documents = documentGroup.total_documents;
      if (Array.isArray(required_documents)) {
        total_documents = required_documents.length;
      }
  
      await documentGroup.update({
        ...documentGroupData,
        total_documents,
      });
  
      return reply.status(200).send({
        status_code: 200,
        message: 'Document group updated successfully',
        trace_id: traceId,
      });
    } catch (error) {
      return reply.status(500).send({
        status_code: 500,
        message: 'Internal Server Error',
        trace_id: traceId,
      });
    }
  }

export async function deleteVendordocumentsgroup(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const { id, program_id } = request.params;
        const [numRowsDeleted] = await vendordocumentgroupModel.update({
            is_enabled: false,
            modified_on: Date.now(),
            is_deleted: true
        },
            { where: { id, program_id } }
        );

        if (numRowsDeleted > 0) {
            reply.status(204).send({
                status_code: 204,
                vendor_documents_group_id: id,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                message: "Vendor documents group not found",
                vendor_documents_group: []
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: "Internal Server Error",
            error,
            trace_id:traceId,
        });
    }
}

export async function getAllVendorCompDocummentGroupByProgramId(request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply) {
    const searchFields = ['program_id', 'id', 'is_enabled', 'description', 'total_documents', 'name'];
    const responseFields = ['id', 'name', 'description', 'total_documents', 'modified_on', 'is_enabled', 'program_id'];
    return baseSearch(request, reply, vendordocumentgroupModel, searchFields, responseFields);
}