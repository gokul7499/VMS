import { FastifyInstance } from "fastify";
import {
    deleteShiftConfiguration,
    updateShiftConfiguration,
    createShiftConfiguration,
    getShiftConfigurationById,
    getAllshiftConfiguration,
    getFilteredShiftConfiguration
} from "../controllers/shift-configuration.controller";

export default async function shiftConfigurationRoutes(fastify: FastifyInstance) {
    fastify.post("/shift-configuration", createShiftConfiguration);
    fastify.get("/program/:program_id/shift-configuration", getAllshiftConfiguration);
    fastify.get("/program/:program_id/shift-configuration/:id", getShiftConfigurationById);
    fastify.put("/program/:program_id/shift-configuration/:id", updateShiftConfiguration);
    fastify.delete("/program/:program_id/shift-configuration/:id", deleteShiftConfiguration);
    fastify.post("/program/:program_id/shift-configuration/advance-filter", getFilteredShiftConfiguration);
}