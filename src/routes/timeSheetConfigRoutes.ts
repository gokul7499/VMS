import { FastifyInstance } from "fastify";
import {
    createTimeSheetConfig,
    getTimeSheetConfigById,
    updateTimeSheetConfigById,
    deleteTimeSheetById,
    getAllTimeSheetConfigByProgramId,
    timeSheetConfigAdvancedFilter,
    getAllHierarchies
} from "../controllers/timeSheetConfigControllers";

async function timeSheetConfigRoutes(fastify: FastifyInstance) {
    fastify.post("/program/:program_id/timesheet-config", createTimeSheetConfig);
    fastify.get("/program/:program_id/timesheet-config/:id", getTimeSheetConfigById);
    fastify.get("/program/:program_id/timesheet-config", getAllTimeSheetConfigByProgramId);
    fastify.put("/program/:program_id/timesheet-config/:id", updateTimeSheetConfigById);
    fastify.delete("/program/:program_id/timesheet-config/:id", deleteTimeSheetById);
    fastify.post("/program/:program_id/timesheet-config/advanced-filter", timeSheetConfigAdvancedFilter);
    fastify.get("/program/:program_id/timesheet-config/get-all-hierarchies", getAllHierarchies)
}

export default timeSheetConfigRoutes;