import { FastifyInstance } from 'fastify';
import {
    createTimesheetExpenseRule,
    getTimesheetExpenseRule,
    getTimesheetExpenseRuleById,
    updateTimesheetExpenseRule,
    deleteTimesheetExpenseRule
} from '../controllers/timesheet-expense-rule.controller';

async function TimesheetExpenseRuleRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/timesheet-expense-rule', createTimesheetExpenseRule);
    fastify.get('/program/:program_id/timesheet-expense-rules', getTimesheetExpenseRule);
    fastify.get('/program/:program_id/timesheet-expense-rule/:id', getTimesheetExpenseRuleById);
    fastify.put('/program/:program_id/timesheet-expense-rule/:id', updateTimesheetExpenseRule);
    fastify.delete('/program/:program_id/timesheet-expense-rule/:id', deleteTimesheetExpenseRule);
}
export default TimesheetExpenseRuleRoutes;
