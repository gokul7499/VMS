
import { FastifyInstance } from "fastify";
import {
    createExpenseType,
    getExpenseTypeById,
    updateExpenseTypeById,
    deleteExpenseTypeById,
    getAllExpenseType,
} from "../controllers/expenseType.controller";
async function expenseTypeRoute(fastify: FastifyInstance) {
    fastify.get("/program/:program_id/expense-type/:id", getExpenseTypeById);
    fastify.post("/program/:program_id/expense-type", createExpenseType);
    fastify.delete("/program/:program_id/expense-type/:id", deleteExpenseTypeById);
    fastify.put("/program/:program_id/expense-type/:id", updateExpenseTypeById);
    fastify.get("/program/:program_id/expense-type", getAllExpenseType);
}
export default expenseTypeRoute;
