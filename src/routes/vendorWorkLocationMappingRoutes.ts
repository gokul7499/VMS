import { FastifyInstance } from "fastify";
import {
    getVendorWorkLocationMappings,
    getVendorWorkLocationMappingById,
    createVendorWorkLocationMapping,
    updateVendorWorkLocationMapping,
    deleteVendorWorkLocationMapping,
} from "../controllers/vendorWorkLocationMappingController";

export default async function vendorWorkLocationMappingRoutes(fastify: FastifyInstance) {
    fastify.get("/program/:program_id/vendor-work-location-mappings", getVendorWorkLocationMappings);
    fastify.get("/program/:program_id/vendor-work-location-mappings/:id", getVendorWorkLocationMappingById);
    fastify.post("/program/:program_id/vendor-work-location-mappings", createVendorWorkLocationMapping);
    fastify.put("/program/:program_id/vendor-work-location-mappings/:id", updateVendorWorkLocationMapping);
    fastify.delete("/program/:program_id/vendor-work-location-mappings/:id", deleteVendorWorkLocationMapping);
}