import { FastifyInstance } from 'fastify';
import {
    createTimesheetExpenseRuleGroup,
    updateTimesheetExpenseRuleGroup,
    deleteTimesheetExpenseRuleGroup,
    getAllTimesheetExpenseRuleGroups,
    getTimesheetExpenseRuleGroupById
} from '../controllers/timesheet-expense-rule-group.controller';

export default async function timesheetExpenseRuleGroupRoutes(fastify: FastifyInstance) {
    fastify.post('/timesheet-expense-rule-groups', createTimesheetExpenseRuleGroup);
    fastify.get('/timesheet-expense-rule-groups/get-all', getAllTimesheetExpenseRuleGroups);
    fastify.get('/timesheet-expense-rule-groups/:id', getTimesheetExpenseRuleGroupById);
    fastify.put('/timesheet-expense-rule-groups/:id', updateTimesheetExpenseRuleGroup);
    fastify.delete('/timesheet-expense-rule-groups/:id', deleteTimesheetExpenseRuleGroup);
}
