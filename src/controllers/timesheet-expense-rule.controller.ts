import { FastifyRequest, FastifyReply } from 'fastify';
import TimesheetExpenseRuleModel from '../models/timesheet-expense-rule.model';
import { TimesheetExpenseRule } from '../interfaces/timesheet-expense-rule.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export async function createTimesheetExpenseRule(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const program_id = request.params.program_id;
    const timesheetRule = request.body as TimesheetExpenseRule;
    const traceId = generateCustomUUID();

    try {
        const item = await TimesheetExpenseRuleModel.create({ ...timesheetRule,program_id });
        reply.status(201).send({
            statusCode: 201,
            trace_id: traceId,
            message: "Timesheet expense rule created succesfully.",
            timesheet_expense_rule: item.id,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

export const getTimesheetExpenseRule = async (
    request: FastifyRequest<{
        Params: { program_id: string };
        Querystring: { rule_name?: string; is_enabled?: boolean | string; modified_on?: string; page?: string; limit?: string };
    }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const { rule_name, is_enabled, modified_on, page = '1', limit = '10' } = request.query;
    const traceId = generateCustomUUID();

    try {
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const offset = (pageNumber - 1) * pageSize;

        const whereCondition: any = { is_deleted: false, program_id };

        if (rule_name) {
            whereCondition.rule_name = { [Op.like]: `%${rule_name}%` };
        }
        if (is_enabled !== undefined) {
            whereCondition.is_enabled = is_enabled === 'true' || is_enabled === true;
        }
        if (modified_on) {
            const dateRange = modified_on.split(',');
            if (dateRange.length === 2) {
                const startDate = parseFloat(dateRange[0].trim());
                const endDate = parseFloat(dateRange[1].trim());
                whereCondition.modified_on = { [Op.between]: [startDate, endDate] };
            }
        }

        const { rows: timesheetRule, count } = await TimesheetExpenseRuleModel.findAndCountAll({
            where: whereCondition,
            limit: pageSize,
            offset,
            order: [['modified_on', 'DESC']]
        });

        if (timesheetRule.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                trace_id: traceId,
                message: 'No timesheet expense rule found.',
                timesheet_expense_rule: [],
            });
        }

        reply.status(200).send({
            statusCode: 200,
            trace_id: traceId,
            message: 'Timesheet expense rule retrieved successfully.',
            items_per_page: pageSize,
            current_page: pageNumber,
            total_records: count,
            timesheet_expense_rule: timesheetRule
        });
    } catch (error:any) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message
        });
    }
};

export async function getTimesheetExpenseRuleById(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params;
        const timesheetRule = await TimesheetExpenseRuleModel.findOne({
            where: { id, program_id, is_deleted: false }
        });
        if (timesheetRule) {
            reply.status(200).send({
                statusCode: 200,
                trace_id: traceId,
                message: "Timesheet expense rule retrieved successfully.",
                timesheet_expense_rule: timesheetRule,
            });
        } else {
            reply.status(200).send({
                trace_id: traceId,
                message: 'No timesheet expense rule found.',
                timesheet_expense_rule: [],
            });
        }
    } catch (error:any) {
        reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching',
            trace_id: traceId,
            error:error.message
        });
    }
}

export async function updateTimesheetExpenseRule(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = request.body as TimesheetExpenseRule;

        const timesheetRule = await TimesheetExpenseRuleModel.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!timesheetRule) {
            return reply.status(200).send({
                trace_id: traceId,
                message: 'No timesheet expense rule found.',
                timesheet_expense_rule: []
            });
        }
        await timesheetRule.update(data);
        reply.status(201).send({
            status_code: 201,
            message: 'Timesheet expense rule updated successfully.',
            trace_id: traceId,
        });
    } catch (error:any) {
        reply.status(500).send({
            message: 'Internal Server Error',
            trace_id: traceId,
            error:error.message
        });
    }
}

export async function deleteTimesheetExpenseRule(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const trace_id = generateCustomUUID();
    try {
        const { id, program_id } = request.params;
        const [numRowsDeleted] = await TimesheetExpenseRuleModel.update({
            is_deleted: true,
            is_enabled: false,
            modified_on: Date.now(),
        },
            { where: { id, program_id } }
        );

        if (numRowsDeleted > 0) {
            reply.status(200).send({
                statusCode: 200,
                trace_id: trace_id,
                message: "Timesheet expense rule deleted succesfully.",
                timesheet_expense_rule: id,
            });
        } else {
            reply.status(404).send({
                statusCode: 404,
                trace_id: trace_id,
                message: 'No timesheet expense rule found.'
            });
        }
    } catch (error:any) {
        reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while deleting.',
            trace_id: trace_id,
            error:error.message
        });
    }
}