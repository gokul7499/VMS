import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import ExpenseRuleGroupRuleModel from '../models/expense-rule-group-rule.model';
import { TimesheetExpenseRuleGroupData } from '../interfaces/timesheet-expense-rule-group.interface';
import TimesheetExpenseRuleModel from '../models/timesheet-expense-rule.model';
import { sequelize } from '../config/instance';
import TimesheetExpenseRuleGroup from '../models/timesheet-expense-rule-group.model';

export const createRuleGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const transaction = await TimesheetExpenseRuleGroup.sequelize?.transaction();
    const trace_id = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };

        const { timesheet_expense_rules_group_mapping, ...data } = request.body as any;
        const newConfig = await TimesheetExpenseRuleGroup.create(
            { program_id, ...data },
            { transaction }
        );
        if (Array.isArray(timesheet_expense_rules_group_mapping) && timesheet_expense_rules_group_mapping.length > 0) {
            for (const rule of timesheet_expense_rules_group_mapping) {
                await ExpenseRuleGroupRuleModel.create(
                    {
                        timesheet_expense_rule_group_id: newConfig.id,
                        timesheet_expense_rule_id: rule.id,
                        rule_type: rule.rule_type,
                        program_id,
                        is_enabled: data.is_enabled,
                    },
                    { transaction }
                );
            }
        }

        await transaction?.commit();
        reply.status(201).send({
            status_code: 201,
            id: newConfig.id,
            message: 'Rule group created successfully.',
            trace_id: trace_id,
        });
    } catch (error) {
        await transaction?.rollback();
        reply.status(500).send({
            message: 'Error creating rule group.',
            error,
            trace_id: trace_id,
        });
    }
};

export const getAllRuleGroups = async (request: FastifyRequest, reply: FastifyReply) => {
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
            data: ruleGroups,
            trace_id: trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error fetching rule groups.',
            error,
            trace_id: trace_id,
        });
    }
};

export const getRuleGroupById = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({
            where: { id, is_deleted: false, program_id },
        });

        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Rule group not found.',
                trace_id: trace_id,
            });
        }
        const timesheet_expense_rule = await ExpenseRuleGroupRuleModel.findAll({
            where: { timesheet_expense_rule_group_id: id },
            include: [
                {
                    model: TimesheetExpenseRuleModel,
                    as: 'timesheet_expense_rule',
                    attributes: ['id', 'rule_name', 'is_enabled', 'program_id', 'rule_type'],
                },
            ],
        });
        const rules = timesheet_expense_rule
            .map(item => item.timesheet_expense_rule)
            .filter(rule => rule);
        const data = {
            ...ruleGroup.toJSON(),
            timesheet_expense_rule: rules,
        };
        reply.status(200).send({
            status_code: 200,
            rule_group: data,
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

export async function updateRuleGroup(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    const updates = request.body as Partial<TimesheetExpenseRuleGroupData & { timesheet_expense_rules_group_mapping: any[] }>;
    const { timesheet_expense_rules_group_mapping, ...updateFields } = updates;
    const transaction = await sequelize.transaction(); 
    try {
        const [updatedCount] = await TimesheetExpenseRuleGroup.update(updateFields, {
            where: { id, program_id },
            transaction,
        });
        if (updatedCount === 0) {
            await transaction.rollback();
            return reply.status(200).send({
                message: 'Timesheet Type Config not found.',
                custom_field_loc: [],
            });
        }
        if (Array.isArray(timesheet_expense_rules_group_mapping)) {
            await ExpenseRuleGroupRuleModel.destroy({
                where: { timesheet_expense_rule_group_id: id },
                transaction,
            });

            if (timesheet_expense_rules_group_mapping.length > 0) {
                await ExpenseRuleGroupRuleModel.bulkCreate(
                    timesheet_expense_rules_group_mapping.map(rule => ({
                        timesheet_expense_rule_group_id: id,
                        timesheet_expense_rule_id: rule.id,
                        rule_type: rule.rule_type,
                        program_id,
                        is_enabled: rule.is_enabled ?? true,
                    })),
                    { transaction }
                );
            }
        }
        await transaction.commit();
        return reply.status(201).send({
            status_code: 201,
            message: 'Rule group updated successfully.',
            timesheet_expense_rule: id,
            trace_id,
        });
    } catch (error) {
        await transaction.rollback();
        return reply.status(500).send({
            message: 'Internal Server Error',
            trace_id,
            error,
        });
    }
}

export const deleteRuleGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const transaction = await TimesheetExpenseRuleGroup.sequelize?.transaction();
    const trace_id = generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({ where: { id, is_deleted: false } });
        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Rule group not found.',
                trace_id: trace_id,
            });
        }
        await ruleGroup.update({ is_deleted: true, is_enabled: false }, { transaction });
        await transaction?.commit();
        reply.status(200).send({
            status_code: 200,
            message: 'Rule group deleted successfully.',
            trace_id: trace_id,
        });
    } catch (error) {
        await transaction?.rollback();
        reply.status(500).send({
            message: 'Error deleting rule group.',
            error,
            trace_id: trace_id,
        });
    }
};


