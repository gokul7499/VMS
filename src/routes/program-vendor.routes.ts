import { FastifyInstance } from "fastify";
import {
    getProgramVendors,
    getProgramVendorById,
    updateProgramVendor,
    updateProgramVendorByUserId,
    deleteProgramVendor,
    saveProgramVendor,
    getVendorAndVendorGroup,
    getVendorDocuments,
    getProgramVendorByUserId,
    updateComplianceDocument,
    getComplianceDocument,
    advanceFilter,
    getProgramVendorDetails
} from "../controllers/program-vendor.controller";

export default async function programVendorRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/program-vendor', getProgramVendors);
    fastify.post('/program/:program_id/program-vendor/advance-filter', advanceFilter);
    fastify.get('/program/:program_id/program-vendor/:id', getProgramVendorById);
    fastify.get('/program/:program_id/program-vendor/user', getProgramVendorByUserId);
    fastify.put('/program/:program_id/program-vendor/:id', updateProgramVendor);
    fastify.put('/program/:program_id/program-vendor/user_id/:user_id', updateProgramVendorByUserId);
    fastify.delete('/program/:program_id/program-vendor/:id', deleteProgramVendor);
    fastify.post('/program/:program_id/program-vendor', saveProgramVendor);
    fastify.get('/program/:program_id/program-vendor/vendor-group', getVendorAndVendorGroup);
    fastify.get('/program/:program_id/program-vendor/required-document', getVendorDocuments);
    fastify.put('/program/:program_id/program-vendor/user', updateComplianceDocument);
    fastify.get('/program/:program_id/program-vendor/user/:user_id', getComplianceDocument);
    fastify.get('/program/:program_id/vendor-detail', getProgramVendorDetails);
}


