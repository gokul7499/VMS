
import InvoiceConfigModel from "../models/invoice-config.model";
import { InvoiceConfigInterface } from "../interfaces/invoice-config.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes } from "sequelize";
import { decodeToken } from "../middlewares/verifyToken";
import { getInvoiceConfigByHierarchyId } from "../utility/queries";
import { sequelize } from "../config/instance";
import HierarchyModel from "../models/hierarchies.model";

export async function createInvoiceConfig(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }

        const userId = user?.sub;

        const { program_id } = request.params as any;
        const invoiceConfig = request.body as InvoiceConfigInterface & { hierarchy_ids: string[] };

        const existingConfig = await sequelize.query(getInvoiceConfigByHierarchyId, {
            replacements: {
                program_id,
                hierarchy_ids: JSON.stringify(invoiceConfig.hierarchy_ids),
            },
            type: QueryTypes.SELECT,
        });
        
        if (existingConfig.length > 0) {
            return reply.status(400).send({
                status_code: 400,
                message: `Invoice Configuration already exists with hierarchy ID(s): ${invoiceConfig.hierarchy_ids}`,
                trace_id: traceId,
            });
        }

        const invoiceConfigData: any = await InvoiceConfigModel.create({
            ...invoiceConfig, program_id, created_by: userId, modified_by: userId,
        });

        reply.status(201).send({
            status_code: 201,
            message: "Invoice config created successfully",
            invoice_config_data: invoiceConfigData?.uuid,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function getInvoiceConfigById(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params;

        const invoiceConfig = await InvoiceConfigModel.findOne({
            where: {
                uuid: id,
                program_id,
                is_deleted: false,
            },
        });

        if (!invoiceConfig) {
            return reply.status(404).send({
                status_code: 404,
                message: "Invoice config not found",
                trace_id: traceId,
            });
        }

        const hierarchyIds = invoiceConfig.hierarchy_ids || [];
        const hierarchies = await HierarchyModel.findAll({
            where: { id: hierarchyIds },
            attributes: ["id", "name"],
        });

        const enhancedInvoiceConfig = {
            ...invoiceConfig.toJSON(),
            hierarchy_details: hierarchies.map((hierarchy) => hierarchy.toJSON()),
        };

        reply.status(201).send({
            status_code: 201,
            message: "Invoice config retrieved successfully",
            invoice_config: enhancedInvoiceConfig,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
        });
    }
}

export async function updateInvoiceConfigById(
    request: FastifyRequest<{ Params: { id: string; program_id: string }; Body: Partial<InvoiceConfigInterface> }>,
    reply: FastifyReply
) {
    const { id, program_id } = request.params;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }

        const userId = user?.sub;
        const invoiceConfig = await InvoiceConfigModel.findOne({
            where: { uuid: id, program_id },
            order: [['id', 'DESC']],
        });

        if (!invoiceConfig) {
            return reply.status(404).send({
                status_code: 404,
                message: "Invoice config data not found",
                trace_id: traceId,
                invoice_config: null,
            });
        }

        const newPayload = {
            ...request.body,
            program_id,
            parent_id: invoiceConfig.id,
            grand_parent_id: invoiceConfig.parent_id || invoiceConfig.id
        };

        const newInvoiceConfig = await InvoiceConfigModel.create({
            ...newPayload,
            created_by: userId,
            modified_by: userId,
        });

        return reply.status(201).send({
            status_code: 201,
            message: "Invoice config updated successfully",
            invoice_config_id: newInvoiceConfig.uuid,
            trace_id: traceId,
        });
    } catch (error: any) {

        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function deleteInvoiceConfigById(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        const { id, program_id } = request.params;

        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;

        const [invoiceConfig] = await InvoiceConfigModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                modified_on: Date.now(),
                modified_by: userId
            },
            { where: { uuid: id, program_id } }
        );
        if (invoiceConfig > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Invoice config deleted successfully",
                invoice_config_id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "Invoice config not found",
                trace_id: traceId,
                invoice_config: []
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId
        });
    }
}

export async function getAllInvoiceConfig(
    request: FastifyRequest<{
        Params: { program_id: string },
        Querystring: { name?: string; page?: number; limit?: number; };
    }>,
    reply: FastifyReply
) {
    const { program_id } = request.params;
    const { name, page = 1, limit = 10 } = request.query;
    const traceId = generateCustomUUID();
    const offset = (page - 1) * limit;
    let whereClause: any = { program_id };

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }

    try {
        const { rows: invoiceConfig, count: total_records } = await InvoiceConfigModel.findAndCountAll({
            where: whereClause,
            attributes: ['uuid', 'name', 'slug', 'hierarchy_ids', 'is_active', 'is_enabled', 'modified_on'],
            order: [["created_on", "DESC"]],
            limit: Number(limit),
            offset: Number(offset),
        });

        if (invoiceConfig.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "No Invoice config found",
                invoice_config: [],
                total_records: 0,
                trace_id: traceId,
            });
        }

        const hierarchyIds = invoiceConfig.flatMap(config => config.hierarchy_ids || []);

        const hierarchies = await HierarchyModel.findAll({
            where: { id: hierarchyIds },
            attributes: ["id", "name"],
        });

        const transformedInvoiceConfig = invoiceConfig.map(config => ({
            ...config.toJSON(),
            hierarchy_details: hierarchies.map(hierarchy => hierarchy.toJSON()),
        }));

        return reply.status(200).send({
            status_code: 200,
            message: "Invoice config retrieved successfully",
            total_records,
            current_page: Number(page),
            page_size: Number(limit),
            invoice_configs: transformedInvoiceConfig,
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
        });
    }
}
