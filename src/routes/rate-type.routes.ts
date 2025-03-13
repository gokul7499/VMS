import { FastifyInstance } from 'fastify';
import {
    saveRateType,
    getAllRateType,
    getRateTypeById,
    updateRateTypeById,
    deleteRateTypeById,
    getDifferentialOnForRateType,
    getShiftAndRateType,
    rateTypeFilter
} from '../controllers/rate-type.controller';

async function rateTypeRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/rate_type', saveRateType);
    fastify.get('/program/:program_id/rate_type/get-all', getAllRateType);
    fastify.get('/program/:program_id/rate_type/:id', getRateTypeById);
    fastify.put('/program/:program_id/rate_type/:id', updateRateTypeById);
    fastify.delete('/program/:program_id/rate_type/:id', deleteRateTypeById);
    fastify.get('/program/:program_id/differential_on', getDifferentialOnForRateType);
    fastify.get('/program/:program_id/get-all/shift', getShiftAndRateType);
    fastify.post('/program/:program_id/rate_type/filter',rateTypeFilter );

}

export default rateTypeRoutes;
