import { FastifyInstance } from 'fastify';
import {
    saveRateCard,
    getAllRateCard,
    getRateCardById,
    updateRateCardById,
    deleteRateCardById,
    getMinMaxRatesByParams,
    getShiftTypes,
    getRateType,
} from '../controllers/rateCardConfigurationController';

async function rateCardRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/rate_config', saveRateCard);
    fastify.get('/program/:program_id/rate_config/get-all', getAllRateCard);
    fastify.get('/program/:program_id/rate_config/:id', getRateCardById);
    fastify.put('/program/:program_id/rate_config/:id', updateRateCardById);
    fastify.delete('/program/:program_id/rate_config/:id', deleteRateCardById);
    fastify.get('/program/:program_id/get-min-max', getMinMaxRatesByParams);
    fastify.get('/program/:program_id/get-rate', getRateType);
    fastify.get('/program/:program_id/get-shift', getShiftTypes);
}

export default rateCardRoutes;
