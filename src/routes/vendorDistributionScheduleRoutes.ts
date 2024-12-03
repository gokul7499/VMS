import { FastifyInstance } from "fastify"
import { createVendorDistributionSchedule, deleteVendorDistributionSchedule, getAllvendorDistributionSchedules, getVendorDistributionScheduleById, updateVendorDistributionSchedule,getVendorDistributionScheduleByIds } from "../controllers/vendorDistributionScheduleController";
async function vendorDistributionScheduleRoutes(fastify: FastifyInstance) {
    fastify.get("/program/:program_id/vendor-distribution-schedules", getAllvendorDistributionSchedules);
    fastify.get("/program/:program_id/vendor-distribution-schedules/:id", getVendorDistributionScheduleById);
    fastify.post("/program/:program_id/vendor-distribution-schedules",createVendorDistributionSchedule );
    fastify.put("/program/:program_id/vendor-distribution-schedules/:id", updateVendorDistributionSchedule);
    fastify.delete("/program/:program_id/vendor-distribution-schedules/:id", deleteVendorDistributionSchedule);
    fastify.get("/program/:program_id/vendor-distribution/:id", getVendorDistributionScheduleByIds);

}
export default vendorDistributionScheduleRoutes;
