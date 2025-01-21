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


export default async function expenseConfigurationRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/expense-config', {
        // preHandler: validatePermissions,
        // config: {
        //     Permissions: [Permissions.EXPENSE_CONFIGURATION],
        //     action: Actions.READ
        // }
    }, getExpenseConfigurations);


    fastify.get('/program/:program_id/expense-config/:id', {
        // preHandler: validatePermissions,
        // config: {
        //     Permissions: [Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
    }, getExpenseConfigurationById);

    fastify.post('/program/:program_id/expense-config', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.CREATE
        // }
    }, createExpenseConfiguration);

    fastify.put('/program/:program_id/expense-config/:id', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.UPDATE
        // }
    },updateExpenseConfiguration);

    fastify.delete('/program/:program_id/expense-config/:id', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.DELETE
        // }
    },deleteExpenseConfiguration);

    fastify.get('/program/:program_id/expense-config-types',{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
    }, getExpenseTypesByProgramIdAndHierarchy);

    fastify.get('/program/:program_id/expense-configs-hierarchies',{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
    }, getAllExpenseConfigurationHierarchies);

    fastify.post('/program/:program_id/expense-configs-advanced-filter',{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.CREATE
        // }
    } ,expenseConfigurationAdvancedFilter);
    
    fastify.get('/program/:program_id/expense-config-type-by-hierarchy', {
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_CONFIGURATION],
        //     action:Actions.READ
        // }
    },getExpenseTypesByProgramIdAndHierarchies);
}
