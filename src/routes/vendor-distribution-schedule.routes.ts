import { FastifyInstance } from "fastify"
import { createVendorDistributionSchedule, deleteVendorDistributionSchedule, getAllvendorDistributionSchedules, getVendorDistributionScheduleById, updateVendorDistributionSchedule,getVendorDistributionScheduleByIds, vendorDistributionScheduleFilter} from "../controllers/vendor-distribution-schedule.controller";
async function vendorDistributionScheduleRoutes(fastify: FastifyInstance) {
    fastify.get("/program/:program_id/vendor-distribution-schedules", getAllvendorDistributionSchedules);
    fastify.get("/program/:program_id/vendor-distribution-schedules/:id", getVendorDistributionScheduleById);
    fastify.post("/program/:program_id/vendor-distribution-schedules",createVendorDistributionSchedule );
    fastify.put("/program/:program_id/vendor-distribution-schedules/:id", updateVendorDistributionSchedule);
    fastify.delete("/program/:program_id/vendor-distribution-schedules/:id", deleteVendorDistributionSchedule);
    fastify.get("/program/:program_id/vendor-distribution/:id", getVendorDistributionScheduleByIds);
    fastify.post('/program/:program_id/vendor-distribution/advance-filter', vendorDistributionScheduleFilter);
}
export default vendorDistributionScheduleRoutes;
