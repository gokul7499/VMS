import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import TimesheetExpenseRuleGroup from '../models/timesheet-expense-rule-group.model';
import { TimesheetExpenseRuleGroupData } from '../interfaces/timesheet-expense-rule-group.interface';
import TimesheetExpenseRuleModel from '../models/timesheet-expense-rule.model';
import { decodeToken } from '../middlewares/verifyToken';

export const createTimesheetExpenseRuleGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;
        const { program_id } = request.params as { program_id: string };
        const { timesheet_expense_rules_group_mapping, ...data } = request.body as any;

        const newConfig = await TimesheetExpenseRuleGroup.create({ program_id, ...data, modified_by:userId, created_by : userId});

        reply.status(201).send({
            status_code: 201,
            id: newConfig.id,
            message: 'Timesheet expense rule group created successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error creating rule group.',
            error,
            trace_id: traceId,
        });
    }
};

export const getAllTimesheetExpenseRuleGroups = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, rule_category } = request.query as {
            page?: string | number;
            limit?: string | number;
            rule_category?: string;
        };

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;
        const searchConditions: Record<string, any> = { is_deleted: false };

        if (program_id) {
            searchConditions.program_id = program_id;
        }

        if (rule_category) {
            searchConditions.rule_category = rule_category;
        }
        const { rows: ruleGroups, count } = await TimesheetExpenseRuleGroup.findAndCountAll({
            where: searchConditions,
            limit: limitNumber,
            offset,
        });

        reply.status(200).send({
            status_code: 200,
            message: "Rule groups retrieved successfully.",
            items_per_page: limitNumber,
            total_records: count,
            timesheet_expense_rule_group: ruleGroups,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: "Error fetching timesheet expense rule groups.",
            error: error.message,
            trace_id: traceId,
        });
    }
};


export const getTimesheetExpenseRuleGroupById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({
            where: { id, is_deleted: false, program_id },
        });
        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet expense rule group not found.',
                trace_id: traceId,
            });
        }
        const timesheetExpenseRules = ruleGroup.timesheet_expense_rules || [];
        if (timesheetExpenseRules.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                timesheet_expense_rule_group: ruleGroup,
                message: "No timesheet expense rules associated with this group.",
                trace_id: traceId,
            });
        }
        const populatedRules = await TimesheetExpenseRuleModel.findAll({
            where: {
                id: timesheetExpenseRules,
                is_enabled: true,
            },
            attributes: [
                'id', 'rule_name', 'is_enabled', 'program_id',
                'rule_type', 'is_paid_break', 'break_type', 'rule_duration',
                'expense_line_item', 'apply_rate_type', 'is_penalty_rule_enabled',
                'penalty_rules', 'conditions', 'weekend_days', 'rule_category'
            ],
        });
        if (populatedRules.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                timesheet_expense_rule_group: ruleGroup,
                message: "No related timesheet expense rules found.",
                trace_id: traceId,
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
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching rule group.',
            error: error.message,
            trace_id: traceId,
        });
    }
};






export async function updateTimesheetExpenseRuleGroup(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    const updates = request.body as Partial<TimesheetExpenseRuleGroupData>;
    const authHeader = request.headers.authorization;

    try {
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;
        const [updatedCount] = await TimesheetExpenseRuleGroup.update({...updates, modified_by:userId}, {
            where: { id, program_id },
        });
        if (updatedCount === 0) {
            return reply.status(200).send({
                message: 'Timesheet expense rule group not found.',
                trace_id: traceId,
            });
        }
        return reply.status(200).send({
            status_code: 200,
            message: 'Timesheet expense rule group updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error,
        });
    }
}

export const deleteTimesheetExpenseRuleGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        const { id } = request.params as { id: string };
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({ where: { id, is_deleted: false } });
        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet expense rule group not found.',
                trace_id: traceId,
            });
        }
        await ruleGroup.update({ is_deleted: true, is_enabled: false, modified_by:userId });
        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet expense rule group deleted successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting rule group.',
            error,
            trace_id: traceId,
        });
    }
};


