import { FastifyInstance } from 'fastify';
import {
    createTimesheetExpenseRule,
    getTimesheetExpenseRule,
    getTimesheetExpenseRuleById,
    updateTimesheetExpenseRule,
    deleteTimesheetExpenseRule,
    filterTimesheetExpenseRule
} from '../controllers/timesheet-expense-rule.controller';
import { createTimesheetExpenseRuleSchema, paramsSchema, QuerySchema } from '../interfaces/timesheet-expense-rule.interface';

async function TimesheetExpenseRuleRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/timesheet-expense-rule',{
        schema: {
            params: paramsSchema,
            body: createTimesheetExpenseRuleSchema
        }
    }, createTimesheetExpenseRule);
    fastify.get('/program/:program_id/timesheet-expense-rules', {
        schema:{
            params:paramsSchema,
            querystring:QuerySchema
        }
    },getTimesheetExpenseRule);
    fastify.get('/program/:program_id/timesheet-expense-rule/:id',{
        schema:{
            params:paramsSchema
        }
    }, getTimesheetExpenseRuleById);
    fastify.put('/program/:program_id/timesheet-expense-rule/:id', 
        {
            schema:{
                params:paramsSchema,
                body: createTimesheetExpenseRuleSchema
            }
        },updateTimesheetExpenseRule);
    fastify.delete('/program/:program_id/timesheet-expense-rule/:id', 
        {
            schema:{
                params:paramsSchema
            }
        },deleteTimesheetExpenseRule);
        fastify.post('/program/:program_id/timesheet-expense-rule/advance-filter', 
            {
                schema:{
                    params:paramsSchema
                }
            },filterTimesheetExpenseRule);
}
export default TimesheetExpenseRuleRoutes;
