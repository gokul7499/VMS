import { FastifyInstance } from 'fastify';
import {
    createRateCardMapping,
    updateRateCardMapping,
    deleteRateCardMapping,
    getAllRateCardMappings,
    getRateCardMappingById
} from '../controllers/rateCardMappingController';

async function RateCardmappingRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/rate-card-mapping', async (request, reply) => {
        await createRateCardMapping(request, reply);
    });
    fastify.put('/program/:program_id/rate-card-mapping/:id', updateRateCardMapping);
    fastify.delete('/program/:program_id/rate-card-mapping/:id', deleteRateCardMapping);
    fastify.get('/program/:program_id/rate-card-mapping', getAllRateCardMappings);
    fastify.get('/program/:program_id/rate-card-mapping/:id', getRateCardMappingById);
}

export default RateCardmappingRoutes;
