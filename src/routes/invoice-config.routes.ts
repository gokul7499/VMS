
import { FastifyInstance } from "fastify";
import {
    getInvoiceConfigById,
    createInvoiceConfig,
    deleteInvoiceConfigById,
    updateInvoiceConfigById,
    getAllInvoiceConfig

} from "../controllers/invoice-config.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";

async function invoiceConfigRoute(fastify: FastifyInstance) {
    fastify.post("/program/:program_id/invoice-config", {
        preHandler: validatePermissions,
        config: {
            permissions: [Permissions.INVOICE_CONFIGURATION],
            action: Actions.CREATE,
        },
    }, createInvoiceConfig);
    fastify.get("/program/:program_id/invoice-configs", {
        preHandler: validatePermissions,
        config: {
            permissions: [Permissions.INVOICE_CONFIGURATION],
            action: Actions.READ,
        },
    }, getAllInvoiceConfig);
    fastify.get("/program/:program_id/invoice-config/:id", {
        preHandler: validatePermissions,
        config: {
            permissions: [Permissions.INVOICE_CONFIGURATION],
            action: Actions.READ,
        },
    }, getInvoiceConfigById);
    fastify.put("/program/:program_id/invoice-config/:id", {
        preHandler: validatePermissions,
        config: {
            permissions: [Permissions.INVOICE_CONFIGURATION],
            action: Actions.UPDATE,
        },
    }, updateInvoiceConfigById);
    fastify.delete("/program/:program_id/invoice-config/:id", {
        preHandler: validatePermissions,
        config: {
            permissions: [Permissions.INVOICE_CONFIGURATION],
            action: Actions.DELETE,
        },
    }, deleteInvoiceConfigById);
}
export default invoiceConfigRoute;
