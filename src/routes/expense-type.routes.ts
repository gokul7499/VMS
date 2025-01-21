
import { FastifyInstance } from "fastify";
import {
    createExpenseType,
    getExpenseTypeById,
    updateExpenseTypeById,
    deleteExpenseTypeById,
    getAllExpenseType,
} from "../controllers/expense-type.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";

async function expenseTypeRoute(fastify: FastifyInstance) {
    fastify.get("/program/:program_id/expense-type/:id",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.READ
        // }
    }, getExpenseTypeById);

    
    fastify.post("/program/:program_id/expense-type",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.CREATE
        // }
    }, createExpenseType);

    fastify.delete("/program/:program_id/expense-type/:id",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.DELETE
        // }
    }, deleteExpenseTypeById);

    fastify.put("/program/:program_id/expense-type/:id",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.UPDATE
        // }
    }, updateExpenseTypeById);
    
    fastify.get("/program/:program_id/expense-type",{
        // preHandler:validatePermissions,
        // config:{
        //     Permissions:[Permissions.EXPENSE_TYPE],
        //     action:Actions.READ
        // }
    }, getAllExpenseType);
}
export default expenseTypeRoute;
