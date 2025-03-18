import { FastifyInstance } from "fastify";
import * as ProgramVendor from "../controllers/program-vendor.controller";
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';

export default async function programVendorRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/program-vendor', {
        preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendor.getProgramVendors);

    fastify.post('/program/:program_id/program-vendor/advance-filter', {
        preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendor.advanceFilter);

    fastify.get('/program/:program_id/program-vendor/:id', {
        preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendor.getProgramVendorById);

    fastify.get('/program/:program_id/program-vendor/user', {
        preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendor.getProgramVendorByUserId);

    fastify.put('/program/:program_id/program-vendor/:id', {
        preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR])
    }, ProgramVendor.updateProgramVendor);

    fastify.put('/program/:program_id/program-vendor/user_id/:user_id', {
        preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR])
    }, ProgramVendor.updateProgramVendorByUserId);

    fastify.delete('/program/:program_id/program-vendor/:id', {
        preHandler: validatePermissions(Actions.DELETE, [Permissions.VENDOR])
    }, ProgramVendor.deleteProgramVendor);

    fastify.post('/program/:program_id/program-vendor', {
        preHandler: validatePermissions(Actions.CREATE, [Permissions.VENDOR])
    }, ProgramVendor.saveProgramVendor);

    fastify.get('/program/:program_id/program-vendor/vendor-group', {
        preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendor.getVendorAndVendorGroup);

    fastify.get('/program/:program_id/program-vendor/required-document', {
        preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendor.getVendorDocuments);

    fastify.put('/program/:program_id/program-vendor/user', {
        preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR])
    }, ProgramVendor.updateComplianceDocument);

    fastify.get('/program/:program_id/program-vendor/user/:user_id', {
        preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendor.getComplianceDocument);
}


