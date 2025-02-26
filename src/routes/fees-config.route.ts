
import { FastifyInstance } from 'fastify';
import {
    getFeesConfigurationById,
    createFeesConfiguration,
    deleteFeesConfigurationById,
    updateFeesConfigurationById,
    getAllFeesConfigByProgramId,
    advancedSearchFeesConfiguration,
    getFeesConfig
} from '../controllers/fees-config.controller';
import { advancedSearchFeesSchema, feesConfigurationSchema, paramsSchema, querySchema } from '../interfaces/fees-config.interface';
async function feesConfigurationRoute(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }

    }, getFeesConfigurationById);
    fastify.post('/program/:program_id/fees', {
        schema: {
            params: paramsSchema,
            body: feesConfigurationSchema,
        }
    }, createFeesConfiguration);
    fastify.delete('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
        }
    }, deleteFeesConfigurationById);
    fastify.put('/program/:program_id/fees/:id', {
        schema: {
            params: paramsSchema,
            body: feesConfigurationSchema,
        }
    }, updateFeesConfigurationById);
    fastify.post('/program/:program_id/fees/advance-filter', {
        schema: {
            params: paramsSchema,
            body: advancedSearchFeesSchema,
        }
    }, advancedSearchFeesConfiguration)
    fastify.get('/program/:program_id/fees', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getAllFeesConfigByProgramId)
    fastify.get('/program/:program_id/fees-config', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getFeesConfig)
}
export default feesConfigurationRoute;
