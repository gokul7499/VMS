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
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";
import { createExpenseConfigurationAdvancedFilter, createExpenseConfigurationSchema, paramsSchema, querySchema } from "../interfaces/expense-configuration.interfaces";


export default async function expenseConfigurationRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/expense-config', {
        // preHandler: validatePermissions,
        // config: {
        //     Permissions: [Permissions.EXPENSE_CONFIGURATION],
        //     action: Actions.READ
        // }
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getExpenseConfigurations);


    fastify.get('/program/:program_id/expense-config/:id', {
        // preHandler: validatePermissions,
        // config: {
        //     Permissions: [Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getExpenseConfigurationById);

    fastify.post('/program/:program_id/expense-config', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.CREATE
        // }
        schema: {
            body:createExpenseConfigurationSchema,
            params: paramsSchema,
        }
    }, createExpenseConfiguration);

    fastify.put('/program/:program_id/expense-config/:id', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.UPDATE
        // }
        schema: {
            body:createExpenseConfigurationSchema,
            params: paramsSchema,
        }
    },updateExpenseConfiguration);

    fastify.delete('/program/:program_id/expense-config/:id', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.DELETE
        // }
        schema: {
            params: paramsSchema,
        }
    },deleteExpenseConfiguration);

    fastify.get('/program/:program_id/expense-config-types',{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getExpenseTypesByProgramIdAndHierarchy);

    fastify.get('/program/:program_id/expense-configs-hierarchies',{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getAllExpenseConfigurationHierarchies);

    fastify.post('/program/:program_id/expense-configs-advanced-filter',{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.CREATE
        // }
        schema:{
            params:paramsSchema,
            body:createExpenseConfigurationAdvancedFilter
        }
    } ,expenseConfigurationAdvancedFilter);
    
    fastify.get('/program/:program_id/expense-config-type-by-hierarchy', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    },getExpenseTypesByProgramIdAndHierarchies);
}
