
import ExpenseTypeModel from "../models/expenseType.model";
import { ExpenseTypeInterface } from "../interfaces/expenseTypeInterface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";

export async function createExpenseType(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id?: string }
        const expenseType = request.body as ExpenseTypeInterface;
        const expenseTypeData: any = await ExpenseTypeModel.create({ ...expenseType, program_id });
        reply.status(201).send({
            status_code: 201,
            message: "expense type created succesfully",
            expense_type_data: expenseTypeData?.id,
            trace_id: traceId,
        });
    } catch (error:any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error:error.message
        });
    }
}
export async function getExpenseTypeById(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID()
    try {
        const { id, program_id } = request.params;
        const expenseType = await ExpenseTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id",] },
        });
        if (expenseType) {
            reply.status(201).send({
                status_code: 201,
                message: "expense type get succesfully",
                expense_item_type_config: expenseType,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "expense type data not found",
                expense_item_type_config: [],
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

export async function updateExpenseTypeById(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string; program_id: string };
    const updates = request.body as Partial<ExpenseTypeInterface>;
    const traceId = generateCustomUUID();
    try {
        const [updatedCount] = await ExpenseTypeModel.update(updates, {
            where: { id, program_id }
        });

        if (updatedCount === 0) {
            return reply.status(200).send({
                message: "Expense type data not found",
                trace_id: traceId,
                expense_item_type_config: []
            });
        }

        return reply.status(201).send({
            status_code: 201,
            message: "Expense type updated successfully",
            expense_type_id: id,
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

export async function deleteExpenseTypeById(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params;
        const [expenseType] = await ExpenseTypeModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                modified_on: Date.now(),
            },
            { where: { id, program_id } }
        );
        if (expenseType > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "expense type deleted successfully",
                expense_item_type_config: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code:200,
                 message: "expense type not found", 
                 trace_id: traceId, 
                 expense_Type: [] });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId
        });
    }
}
export async function getAllExpenseType(request: FastifyRequest<{ Querystring: { name?: string ,code?:string,category?:string,apply_msp_fee?:string,appply_tax?:string,allow_unit_based?:string,is_enabled?:string,page?:number,limit?:number} }>, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string }
    const { name,code,category ,apply_msp_fee,appply_tax,allow_unit_based,is_enabled,page,limit} = request.query;
    const traceId = generateCustomUUID();
    let whereClause: any = { program_id };

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }
    if (code) {
        whereClause.code = code;
    }
    if (category) {
        whereClause.category = category;
    }
    if (apply_msp_fee !== undefined) {
        whereClause.apply_msp_fee = apply_msp_fee === "true";
    }
    if (appply_tax !== undefined) {
        whereClause.appply_tax = appply_tax === "true";
    }
    if(allow_unit_based !== undefined){
        whereClause.allow_unit_based=allow_unit_based ==="true"
    }
    if (is_enabled !== undefined) {
        whereClause.is_enabled = is_enabled === "true";
    }
    const pageSize=parseInt(page as unknown as string)|| 1
    const pageNumber=parseInt(limit as unknown as string) || 10
    const offset=(pageSize-1)*pageNumber

    try {
        const {rows:expenseType,count:total_records} = await ExpenseTypeModel.findAndCountAll({
             where: whereClause,
             offset,
             limit:pageSize
             });
        if (expenseType.length > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "expense type retrieved successfully",
                expense_item_type_config: expenseType,
                total_records:total_records,
                page:page,
                limit:limit,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "expense type not found", expense_item_type_config: [], trace_id:traceId, });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id:traceId });
    }
}