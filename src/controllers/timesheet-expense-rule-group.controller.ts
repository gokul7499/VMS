import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import TimesheetExpenseRuleGroup from '../models/timesheet-expense-rule-group.model';
import { TimesheetExpenseRuleGroupData } from '../interfaces/timesheet-expense-rule-group.interface';
import TimesheetExpenseRuleModel from '../models/timesheet-expense-rule.model';

export const createTimesheetExpenseRuleGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { timesheet_expense_rules_group_mapping, ...data } = request.body as any;

        const newConfig = await TimesheetExpenseRuleGroup.create({ program_id, ...data });

        reply.status(201).send({
            status_code: 201,
            id: newConfig.id,
            message: 'Timesheet expense rule group created successfully.',
            trace_id: trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error creating rule group.',
            error,
            trace_id: trace_id,
        });
    }
};

export const getAllTimesheetExpenseRuleGroups = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, rule_category } = request.query as {
            page?: number;
            limit?: number;
            rule_category?: string;
        };
        const offset = (page - 1) * limit;
        const searchConditions: Record<string, any> = { is_deleted: false };
        if (program_id) {
            searchConditions.program_id = program_id;
        }
        if (rule_category) {
            searchConditions.rule_category = rule_category;
        }
        const { rows: ruleGroups, count } = await TimesheetExpenseRuleGroup.findAndCountAll({
            where: searchConditions,
            limit,
            offset,
        });
        reply.status(200).send({
            status_code: 200,
            items_per_page: limit,
            total_records: count,
            timesheet_expense_rule_group: ruleGroups,
            trace_id: trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error fetching timesheet expense rule groups.',
            error,
            trace_id: trace_id,
        });
    }
};

export const getTimesheetExpenseRuleGroupById = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({
            where: { id, is_deleted: false, program_id },
        });
        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet expense rule group not found.',
                trace_id: trace_id,
            });
        }
        const timesheetExpenseRules = ruleGroup.timesheet_expense_rules || [];
        if (timesheetExpenseRules.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                timesheet_expense_rule_group: ruleGroup,
                message: "No timesheet expense rules associated with this group.",
                trace_id: trace_id,
            });
        }
        const populatedRules = await TimesheetExpenseRuleModel.findAll({
            where: {
                id: timesheetExpenseRules,
                is_enabled: true,
            },
            attributes: ['id', 'rule_name', 'is_enabled', 'program_id', 'rule_type'],
        });
        if (populatedRules.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                timesheet_expense_rule_group: ruleGroup,
                message: "No related timesheet expense rules found.",
                trace_id: trace_id,
            });
        }
        const data = {
            ...ruleGroup.toJSON(),
            timesheet_expense_rules: populatedRules.map(rule => rule.toJSON()),  // Convert populated rules to JSON
        };
        reply.status(200).send({
            status_code: 200,
            timesheet_expense_rule_group: data,
            message: "Timesheet expense rule group retrieved successfully.",
            trace_id: trace_id,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching rule group.',
            error: error.message,
            trace_id: trace_id,
        });
    }
};






export async function updateTimesheetExpenseRuleGroup(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    const updates = request.body as Partial<TimesheetExpenseRuleGroupData>; // Updated to simplify the input

    try {
        const [updatedCount] = await TimesheetExpenseRuleGroup.update(updates, {
            where: { id, program_id },
        });
        if (updatedCount === 0) {
            return reply.status(200).send({
                message: 'Timesheet expense rule group not found.',
                trace_id,
            });
        }
        return reply.status(200).send({
            status_code: 200,
            message: 'Timesheet expense rule group updated successfully.',
            trace_id,
        });
    } catch (error) {
        return reply.status(500).send({
            message: 'Internal Server Error',
            trace_id,
            error,
        });
    }
}

export const deleteTimesheetExpenseRuleGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({ where: { id, is_deleted: false } });
        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet expense rule group not found.',
                trace_id: trace_id,
            });
        }
        await ruleGroup.update({ is_deleted: true, is_enabled: false });
        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet expense rule group deleted successfully.',
            trace_id: trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error deleting rule group.',
            error,
            trace_id: trace_id,
        });
    }
};


