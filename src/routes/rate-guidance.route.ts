import { FastifyInstance } from 'fastify';
import * as RateGuidanceController from '../controllers/rate-guidance.controller';
import { rateGuidanceSchema, paramsSchema, querySchema, advancedSearchSchema, bulkUploadSchema } from '../interfaces/rate-guidance.interface';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function rateGuidanceRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);

    fastify.post('/program/:program_id/rate-guidance', {
        schema: {
            body: rateGuidanceSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceController.createRateGuidance);

    fastify.put('/program/:program_id/rate-guidance/:id', {
        schema: {
            body: rateGuidanceSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceController.updateRateGuidance);

    fastify.delete('/program/:program_id/rate-guidance/:id', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceController.deleteRateGuidance);

    fastify.get('/program/:program_id/rate-guidance/:id', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceController.getRateGuidanceById);

    fastify.get('/program/:program_id/rate-guidance', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceController.getAllRateGuidance);

    fastify.post('/program/:program_id/rate-guidance/advanced-search', {
        schema: {
            params: paramsSchema,
            body: advancedSearchSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceController.advancedSearchRateGuidance);

    fastify.post('/program/:program_id/rate-guidance/bulk-upload', {
        schema: {
            params: paramsSchema,
            body: bulkUploadSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RATE_GUIDANCE])
    }, RateGuidanceController.bulkUploadRateGuidance);
}

export default rateGuidanceRoutes;
