import { FastifyRequest, FastifyReply } from 'fastify';
import TimesheetExpenseRuleModel from '../models/timesheet-expense-rule.model';
import { TimesheetExpenseRule } from '../interfaces/timesheet-expense-rule.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op, QueryTypes } from 'sequelize';
import { getExpenseTypeAndRateType } from '../utility/queries';
import { sequelize } from '../config/instance';

export async function createTimesheetExpenseRule(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const program_id = request.params.program_id;
    const timesheetRule = request.body as TimesheetExpenseRule;
    const traceId = generateCustomUUID();

    try {
        const item = await TimesheetExpenseRuleModel.create({ ...timesheetRule, program_id });
        reply.status(201).send({
            status_code: 201,
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

interface TimesheetExpenseRuleData {
    id: string;
    expense_line_item: any[];
    expense_rate_type: any[];
}

export const getTimesheetExpenseRule = async (
    request: FastifyRequest<{
        Params: { program_id: string };
        Querystring: {
            rule_name?: string;
            rule_type: string;
            rule_category: string;
            is_enabled?: boolean | string;
            modified_on?: string;
            page?: string;
            limit?: string;
        };
    }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const { rule_name, rule_type, rule_category, is_enabled, modified_on, page = '1', limit = '10' } = request.query;
    const traceId = generateCustomUUID();

    try {
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const offset = (pageNumber - 1) * pageSize;

        const whereCondition: any = { is_deleted: false, program_id };

        if (rule_name) {
            whereCondition.rule_name = { [Op.like]: `%${rule_name}%` };
        }
        if (rule_category) {
            whereCondition.rule_category = { [Op.like]: `%${rule_category}%` };
        }
        if (rule_type) {
            const ruleTypes = rule_type.split(',').map((type) => type.trim());
            whereCondition.rule_type = { [Op.in]: ruleTypes };
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
        const timesheetRuleData = await TimesheetExpenseRuleModel.findAll({
            where: whereCondition,
            attributes: [
                'id',
                'rule_name',
                'is_enabled',
                'rule_type',
                'rule_duration',
                'is_penalty_rule_enabled',
                'conditions',
                'rule_category',
                'modified_on',
                'program_id',
                'apply_rate_type',
                'penalty_rules',
                'expense_line_item',
            ],
            limit: pageSize,
            offset,
            order: [['modified_on', 'DESC']],
        });
        const timesheetExpenseRules: TimesheetExpenseRuleData[] = await sequelize.query(getExpenseTypeAndRateType, {
            replacements: { program_id },
            type: QueryTypes.SELECT,
        });

        if (timesheetRuleData.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'No timesheet expense rule found.',
                timesheet_expense_rule: [],
            });
        }
        const mergedRules = timesheetRuleData.map((rule) => {
            const matchingExpenseData = timesheetExpenseRules.find(
                (expenseRule) => expenseRule.id === rule.id
            );
            return {
                ...rule.toJSON(),
                expense_line_item: matchingExpenseData?.expense_line_item || [],
                apply_rate_type: matchingExpenseData?.expense_rate_type || [],
            };
        });

        // Response
        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Timesheet expense rule retrieved successfully.',
            items_per_page: pageSize,
            current_page: pageNumber,
            total_records: timesheetRuleData.length,
            timesheet_expense_rule: mergedRules,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
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
                status_code: 200,
                trace_id: traceId,
                message: "Timesheet expense rule retrieved successfully.",
                timesheet_expense_rule: timesheetRule,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'No timesheet expense rule found.',
                timesheet_expense_rule: [],
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching',
            trace_id: traceId,
            error: error.message
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
                status_code: 200,
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
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function deleteTimesheetExpenseRule(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
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
                status_code: 200,
                trace_id: traceId,
                message: "Timesheet expense rule deleted succesfully.",
                timesheet_expense_rule: id,
            });
        } else {
            reply.status(404).send({
                status_code: 404,
                trace_id: traceId,
                message: 'No timesheet expense rule found.'
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting.',
            trace_id: traceId,
            error: error.message
        });
    }
}