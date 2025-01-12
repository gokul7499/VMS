
import { FastifyInstance } from "fastify";
import {
    getInvoiceConfigById,
    createInvoiceConfig,
    deleteInvoiceConfigById,
    updateInvoiceConfigById,
    getAllInvoiceConfig

} from "../controllers/invoice-config.controller";

async function invoiceConfigRoute(fastify: FastifyInstance) {
    fastify.post("/program/:program_id/invoice-config", createInvoiceConfig);
    fastify.get("/program/:program_id/invoice-configs", getAllInvoiceConfig);
    fastify.get("/program/:program_id/invoice-config/:id", getInvoiceConfigById);
    fastify.put("/program/:program_id/invoice-config/:id", updateInvoiceConfigById);
    fastify.delete("/program/:program_id/invoice-config/:id", deleteInvoiceConfigById);

}
export default invoiceConfigRoute;
