import { FastifyInstance } from 'fastify';
import {
    saveRateType,
    getAllRateType,
    getRateTypeById,
    updateRateTypeById,
    deleteRateTypeById,
    getDifferentialOnForRateType
} from '../controllers/rateTypeController';

async function rateTypeRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/rate_type', saveRateType);
    fastify.get('/program/:program_id/rate_type/get-all', getAllRateType);
    fastify.get('/program/:program_id/rate_type/:id', getRateTypeById);
    fastify.put('/program/:program_id/rate_type/:id', updateRateTypeById);
    fastify.delete('/program/:program_id/rate_type/:id', deleteRateTypeById);
    fastify.get('/program/:program_id/differential_on', getDifferentialOnForRateType);
}

export default rateTypeRoutes;
