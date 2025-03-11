import { FastifyRequest, FastifyReply } from 'fastify';
import TimesheetExpenseRuleModel from '../models/timesheet-expense-rule.model';
import { TimesheetExpenseRule } from '../interfaces/timesheet-expense-rule.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op, QueryTypes } from 'sequelize';
import { getExpenseTypeAndRateType } from '../utility/queries';
import { sequelize } from '../config/instance';
import { decodeToken } from '../middlewares/verifyToken';
import RateType from '../models/rate-type.model';

export async function createTimesheetExpenseRule(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const program_id = request.params.program_id;
    const timesheetRule = request.body as TimesheetExpenseRule;
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
    const userId = user?.sub;
    console.log("uuu", userId)

    try {
        timesheetRule.rule_duration = timesheetRule.rule_duration?.toLowerCase();
        const existingRule = await TimesheetExpenseRuleModel.findOne({
            where: {
                program_id,
                rule_name: timesheetRule.rule_name,
                is_deleted: false
            }
        });
        if (existingRule) {
            return reply.status(409).send({
                status_code: 409,
                message: 'Rule name already exists.',
                trace_id: traceId,
            });
        }

        const item = await TimesheetExpenseRuleModel.create({
            ...timesheetRule, program_id, created_by: userId,
            updated_by: userId,
        });
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
            updated_on?: string;
            page?: string;
            limit?: string;
        };
    }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const { rule_name, rule_type, rule_category, is_enabled, updated_on, page = '1', limit = '10' } = request.query;
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
        if (updated_on) {
            const dateRange = updated_on.split(',').map(date => new Date(date.trim()));

            if (dateRange.length === 2 && !isNaN(dateRange[0].getTime()) && !isNaN(dateRange[1].getTime())) {
                whereCondition.updated_on = { [Op.between]: [dateRange[0].toISOString(), dateRange[1].toISOString()] };
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
                'is_paid_break',
                'is_penalty_rule_enabled',
                'conditions',
                'rule_category',
                'updated_on',
                'program_id',
                'apply_rate_type',
                'penalty_rules', 
                'expense_line_item',
            ],
            limit: pageSize,
            offset,
            order: [['created_on', 'DESC']],
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
        const mergedRules = await Promise.all(
            timesheetRuleData.map(async (rule) => {
              const matchingExpenseData = timesheetExpenseRules.find(
                (expenseRule) => expenseRule.id === rule.id
              );
              const updatedRule = rule.toJSON();
          
              if (updatedRule.penalty_rules) {
                const allKeysNull = Object.values(updatedRule.penalty_rules).every(
                  (value) => value === null || value === undefined
                );
                if (allKeysNull) {
                  updatedRule.penalty_rules = null;
                } else if (updatedRule.penalty_rules.apply_rate_type) {
                  const penaltyRateType = await RateType.findOne({
                    where: { id: updatedRule.penalty_rules.apply_rate_type },
                    attributes: ['id', 'name', 'abbreviation'],
                  });
                  if (penaltyRateType) {
                    updatedRule.penalty_rules.apply_rate_type = penaltyRateType;}
                }
              } else {
                updatedRule.penalty_rules = null;
              }
          
              return {
                ...updatedRule,
                expense_line_item: matchingExpenseData?.expense_line_item || [],
                apply_rate_type: matchingExpenseData?.expense_rate_type || [],
              };
            })
          );
        

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
            where: { id, program_id, is_deleted: false },
        });

        if (!timesheetRule) {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'No timesheet expense rule found.',
                timesheet_expense_rule: [],
            });
            return;
        }

        const applyRateTypeIds = timesheetRule.apply_rate_type;
        if (Array.isArray(applyRateTypeIds) && applyRateTypeIds.length > 0) {
            const rateTypes = await RateType.findAll({
                where: {
                    id: { [Op.in]: applyRateTypeIds },
                },
                attributes: ['id', 'name','abbreviation'],
            });
            timesheetRule.setDataValue('apply_rate_type', rateTypes);
        }
        let penaltyRules = timesheetRule.penalty_rules;
        if (penaltyRules) {
          const allKeysNull = Object.values(penaltyRules).every(value => value === null || value === undefined);
        
          if (!allKeysNull) {
            if (penaltyRules.apply_rate_type) {
              const penaltyRateType = await RateType.findOne({
                where: { id: penaltyRules.apply_rate_type },
                attributes: ['id', 'name', 'abbreviation'],
              });
              if (penaltyRateType) {
                penaltyRules.apply_rate_type = penaltyRateType;
              }
            }
            timesheetRule.setDataValue('penalty_rules', penaltyRules);
          } else {
            timesheetRule.setDataValue('penalty_rules', null);
          }
        } else {
          timesheetRule.setDataValue('penalty_rules', null);
        }

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Timesheet expense rule retrieved successfully.',
            timesheet_expense_rule: timesheetRule,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching the timesheet expense rule.',
            trace_id: traceId,
            error: error.message,
        });
    }
}
export async function updateTimesheetExpenseRule(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
            status_code: 401,
            message: 'Unauthorized - Token not found',
        });
    }

    try {
        const token = authHeader.split(' ')[1];
        const user = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({
                status_code: 401,
                message: 'Unauthorized - Invalid token',
            });
        }
        const userId = user?.sub;
        const { id, program_id } = request.params as {
             id: string; program_id: string };
        const updateData = request.body as Partial<TimesheetExpenseRule>;

        const existingRule = await TimesheetExpenseRuleModel.findOne({
            where: {
                rule_name: updateData.rule_name, 
                program_id,
                id: { [Op.ne]: id }, 
            },
        });

        if (existingRule) {
            return reply.status(409).send({
                status_code: 409,
                message: 'Rule name already exists.',
                trace_id: traceId,
            });
        }
        const [affectedRows] = await TimesheetExpenseRuleModel.update(
            {
                ...updateData,
                updated_on: Date.now(),
                updated_by: userId,
            },
            {
                where: {
                    id,
                    program_id,
                    is_deleted: false,
                },
            }
        );

        if (!affectedRows) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'Timesheet expense rule not found.',
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Timesheet expense rule updated successfully.',
            trace_id: traceId,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}


export async function deleteTimesheetExpenseRule(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
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
    const userId = user?.sub
    try {
        const { id, program_id } = request.params;
        const [numRowsDeleted] = await TimesheetExpenseRuleModel.update({
            is_deleted: true,
            is_enabled: false,
            updated_on: Date.now(),
            updated_by: userId,
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