
import { FastifyInstance } from "fastify";
import {
    createExpenseType,
    getExpenseTypeById,
    updateExpenseTypeById,
    deleteExpenseTypeById,
    getAllExpenseType,
    advancefilter
} from "../controllers/expense-type.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";
import { createExpenseTypeSchema, paramsSchema, querySchema } from "../interfaces/expense-type.interface";

async function expenseTypeRoute(fastify: FastifyInstance) {
    fastify.get("/program/:program_id/expense-type/:id",
        {
    //     // preHandler:validatePermissions,
    //     // config:{
    //     //     Permissions:[Permissions.EXPENSE_TYPE],
    //     //     action:Actions.READ
    //     // }
    
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }
    ,getExpenseTypeById);

    
    fastify.post("/program/:program_id/expense-type",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.CREATE
        // }
        schema: {
            params: paramsSchema,
            body: createExpenseTypeSchema,
        }
    }, createExpenseType);

    fastify.delete("/program/:program_id/expense-type/:id",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.DELETE
        // }
        schema: {
            params: paramsSchema,
        }

    }, deleteExpenseTypeById);

    fastify.put("/program/:program_id/expense-type/:id",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.UPDATE
        // }
        schema: {
            body: createExpenseTypeSchema,
            params: paramsSchema,
        }
    }, updateExpenseTypeById);
    
    fastify.get("/program/:program_id/expense-type",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.READ
        // },
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getAllExpenseType);
    fastify.post("/program/:program_id/expense-type/advancefilter",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.READ
        // },
        schema: {
            params: paramsSchema,
            // querystring: querySchema,
        }
    }, advancefilter);
}
export default expenseTypeRoute;
