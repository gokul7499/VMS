
import InvoiceConfigModel from "../models/invoice-config.model";
import { InvoiceConfigInterface } from "../interfaces/invoice-config.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";

export async function createInvoiceConfig(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as any
        const invoiceConfig = request.body as InvoiceConfigInterface;
        const invoiceConfigData: any = await InvoiceConfigModel.create({ ...invoiceConfig, program_id });
        reply.status(201).send({
            status_code: 201,
            message: "Invoice config created succesfully",
            invoice_config_data: invoiceConfigData?.id,
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
    const traceId = generateCustomUUID()
    try {
        const { id, program_id } = request.params;
        const invoiceConfig = await InvoiceConfigModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });

        if (invoiceConfig) {
            reply.status(201).send({
                status_code: 201,
                message: "Invoice config get succesfully",
                invoice_config: invoiceConfig,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "Invoice config data not found",
                invoice_config: [],
                trace_id: traceId
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

export async function updateInvoiceConfigById(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string; program_id: string };
    const updates = request.body as Partial<InvoiceConfigInterface>;
    const traceId = generateCustomUUID();
    try {
        const [updatedCount] = await InvoiceConfigModel.update(updates, {
            where: { id, program_id }
        });

        if (updatedCount === 0) {
            return reply.status(200).send({
                message: "Invoice config data not found",
                trace_id: traceId,
                invoice_config: []
            });
        }

        return reply.status(201).send({
            status_code: 201,
            message: "Invoice config updated successfully",
            invoice_config_id: id,
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function deleteInvoiceConfigById(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params;
        const [invoiceConfig] = await InvoiceConfigModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                modified_on: Date.now(),
            },
            { where: { id, program_id } }
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
        Querystring: { name?: string; page?: number; limit?: number; };
    }>,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const { name, page = 1, limit = 10 } = request.query;
    const traceId = generateCustomUUID();
    let whereClause: any = { program_id };
    const offset = (page - 1) * limit;

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }

    try {
        const { rows: invoiceConfig, count: total_records } = await InvoiceConfigModel.findAndCountAll({
            where: whereClause,
            order: [["created_on", "DESC"]],
            limit: Number(limit),
            offset: Number(offset),
        })

        if (invoiceConfig.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "No Invoice config found",
                invoice_config: [],
                total_records: 0,
                trace_id: traceId,
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "Invoice config retrieved successfully",
            total_records: total_records,
            curent_page: Number(page),
            page_size: Number(limit),
            invoice_config: invoiceConfig,
            trace_id: traceId,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId
        });
    }
}
