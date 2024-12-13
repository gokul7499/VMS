import { FastifyInstance } from 'fastify';
import {
    createRuleGroup,
    updateRuleGroup,
    deleteRuleGroup,
    getAllRuleGroups,
    getRuleGroupById
} from '../controllers/timesheet-expense-rule-group.controller';

export default async function timesheetExpenseRuleGroupRoutes(fastify: FastifyInstance) {
    fastify.post('/timesheet-expense-rule-groups', createRuleGroup);
    fastify.get('/timesheet-expense-rule-groups/get-all', getAllRuleGroups);
    fastify.get('/timesheet-expense-rule-groups/:id', getRuleGroupById);
    fastify.put('/timesheet-expense-rule-groups/:id', updateRuleGroup);
    fastify.delete('/timesheet-expense-rule-groups/:id', deleteRuleGroup);
}
