import { FastifyInstance } from "fastify";
import { getAllTimeSheetConfigByProgramId, getTimeSheetConfigRuleById, getAllTimeSheetConfig, timeSheetConfigAdvancedFilter, createTimeSheetConfigRule, updateTimeSheetConfigRuleById, deleteTimeSheetRuleById, } from "../controllers/timesheetruleconfigController";
export async function timesheetRuleRoutes(fastify: FastifyInstance) {
    fastify.get("/program/:program_id/timesheet-config-rule", getAllTimeSheetConfigByProgramId);
    fastify.get("/program/:program_id/timesheet-config-getall", getAllTimeSheetConfig);
    fastify.get("/program/:program_id/timesheet-config-rule/:id", getTimeSheetConfigRuleById);
    fastify.post("/program/:program_id/timesheet-config-rule", createTimeSheetConfigRule);
    fastify.put("/program/:program_id/timesheet-config-rule/:id", updateTimeSheetConfigRuleById);
    fastify.delete("/program/:program_id/timesheet-config-rule/:id", deleteTimeSheetRuleById);
    fastify.post("/program/:program_id/timesheet-config-rule/advanced-filter", timeSheetConfigAdvancedFilter);
}

export default timesheetRuleRoutes;

