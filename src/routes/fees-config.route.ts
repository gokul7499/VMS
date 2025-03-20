import { FastifyInstance } from 'fastify';
import * as FeesController from '../controllers/fees-config.controller';
import { advancedSearchFeesSchema, feesConfigurationSchema, paramsSchema, querySchema } from '../interfaces/fees-config.interface';
import { verifyToken } from '../middlewares/verifyToken';

async function feesConfigurationRoute(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);

    fastify.get('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, FeesController.getFeesConfigurationById);

    fastify.post('/program/:program_id/fees', {
        schema: {
            params: paramsSchema,
            body: feesConfigurationSchema,
        }
    }, FeesController.createFeesConfiguration);

    fastify.delete('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
        }
    }, FeesController.deleteFeesConfigurationById);

    fastify.put('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
            body: feesConfigurationSchema,
        }
    }, FeesController.updateFeesConfigurationById);

    fastify.post('/program/:program_id/fees/advance-filter', {
        schema: {
            params: paramsSchema,
            body: advancedSearchFeesSchema,
        }
    }, FeesController.advancedSearchFeesConfiguration);

    fastify.get('/program/:program_id/fees', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, FeesController.getAllFeesConfigByProgramId);

    fastify.get('/program/:program_id/fees-config', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, FeesController.getFeesConfig);
}

export default feesConfigurationRoute;