
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
async function feesConfigurationRoute(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/fees/:id', getFeesConfigurationById);
    fastify.post('/program/:program_id/fees', createFeesConfiguration);
    fastify.delete('/program/:program_id/fees/:id', deleteFeesConfigurationById);
    fastify.put('/program/:program_id/fees/:id', updateFeesConfigurationById);
    fastify.post('/program/:program_id/fees/advance-filter', advancedSearchFeesConfiguration)
    fastify.get('/program/:program_id/fees', getAllFeesConfigByProgramId)
    fastify.get('/program/:program_id/fees-config', getFeesConfig)
}
export default feesConfigurationRoute;
