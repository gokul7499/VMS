import { FastifyInstance } from 'fastify';
import * as RateGuidanceControllerMaster from '../controllers/rate-guidance-master.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function rateGuidanceMasterRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);

    fastify.post('/program/:program_id/rate-guidance', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceControllerMaster.createRateGuidance);

    fastify.put('/program/:program_id/rate-guidance/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceControllerMaster.updateRateGuidance);

    fastify.delete('/program/:program_id/rate-guidance/:id', {
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceControllerMaster.deleteRateGuidance);

    fastify.get('/program/:program_id/rate-guidance/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceControllerMaster.getRateGuidanceById);

    fastify.get('/program/:program_id/rate-guidance', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceControllerMaster.getAllRateGuidance);

    fastify.post('/program/:program_id/rate-guidance/advanced-search', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceControllerMaster.advancedSearchRateGuidance);

    fastify.post('/program/:program_id/rate-guidance/bulk-upload', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceControllerMaster.bulkUploadRateGuidance);
}

export default rateGuidanceMasterRoutes;
