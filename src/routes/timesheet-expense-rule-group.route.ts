import { FastifyInstance } from 'fastify';
import {
    createTimesheetExpenseRuleGroup,
    updateTimesheetExpenseRuleGroup,
    deleteTimesheetExpenseRuleGroup,
    getAllTimesheetExpenseRuleGroups,
    getTimesheetExpenseRuleGroupById,
    filterTimesheetExpenseRuleGroups
} from '../controllers/timesheet-expense-rule-group.controller';
import { createTimesheetExpenseRuleGroupSchema, paramsSchema, querySchema } from '../interfaces/timesheet-expense-rule-group.interface';

export default async function timesheetExpenseRuleGroupRoutes(fastify: FastifyInstance) {
    fastify.post('/timesheet-expense-rule-groups',{
        schema: {
            params: paramsSchema,
           body:createTimesheetExpenseRuleGroupSchema
        }
    }, createTimesheetExpenseRuleGroup);
    fastify.get('/timesheet-expense-rule-groups/get-all', {
        schema: {
            params: paramsSchema,
            querystring:querySchema
        }
    },getAllTimesheetExpenseRuleGroups);
    fastify.get('/timesheet-expense-rule-groups/:id',{
        schema: {
            params: paramsSchema,
        }
    }, getTimesheetExpenseRuleGroupById);
    fastify.put('/timesheet-expense-rule-groups/:id',{
        schema: {
            params: paramsSchema,
           body:createTimesheetExpenseRuleGroupSchema
        }
    }, updateTimesheetExpenseRuleGroup);
    fastify.delete('/timesheet-expense-rule-groups/:id', {
        schema: {
            params: paramsSchema
        }
    },deleteTimesheetExpenseRuleGroup);
    fastify.post('/timesheet-expense-rule-groups/advance-filter', {
        schema: {
            params: paramsSchema
        }
    },filterTimesheetExpenseRuleGroups);
}
