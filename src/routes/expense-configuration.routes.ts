import { FastifyInstance } from "fastify";
import {
    getExpenseConfigurations,
    getExpenseConfigurationById,
    createExpenseConfiguration,
    updateExpenseConfiguration,
    deleteExpenseConfiguration,
    getExpenseTypesByProgramIdAndHierarchy,
    getAllExpenseConfigurationHierarchies,
    expenseConfigurationAdvancedFilter,
    getExpenseTypesByProgramIdAndHierarchies
} from "../controllers/expense-configuration.controller";

export default async function expenseConfigurationRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/expense-config', getExpenseConfigurations);
    fastify.get('/program/:program_id/expense-config/:id', getExpenseConfigurationById);
    fastify.post('/program/:program_id/expense-config', createExpenseConfiguration);
    fastify.put('/program/:program_id/expense-config/:id', updateExpenseConfiguration);
    fastify.delete('/program/:program_id/expense-config/:id', deleteExpenseConfiguration);
    fastify.get('/program/:program_id/expense-config-types', getExpenseTypesByProgramIdAndHierarchy);
    fastify.get('/program/:program_id/expense-configs-hierarchies', getAllExpenseConfigurationHierarchies);
    fastify.post('/program/:program_id/expense-configs-advanced-filter', expenseConfigurationAdvancedFilter);
    fastify.get('/program/:program_id/expense-config-type-by-hierarchy', getExpenseTypesByProgramIdAndHierarchies);

}
