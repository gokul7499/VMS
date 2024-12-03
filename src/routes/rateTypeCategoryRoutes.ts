import { FastifyInstance } from 'fastify';
import {
    createRateTypeCategory,
    updateRateTypeCategory,
    deleteRateTypeCategory,
    getAllRateTypeCategory,
    getRateTypeCategoryById
} from '../controllers/rateTypeCategoryController';

async function RateTypeCategoryRoutes(fastify: FastifyInstance) {
    fastify.post('/rate-type-category', async (request, reply) => { await createRateTypeCategory(request, reply); });
    fastify.put('/rate-type-category/:id', updateRateTypeCategory);
    fastify.delete('/rate-type-category/:id', deleteRateTypeCategory);
    fastify.get('/rate-type-category', getAllRateTypeCategory);
    fastify.get('/rate-type-category/:id', getRateTypeCategoryById);
}

export default RateTypeCategoryRoutes;
