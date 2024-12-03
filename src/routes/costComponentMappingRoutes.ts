import { FastifyInstance } from 'fastify';
import {
    createCostComponentMapping,
    getAllCostComponentMapping,
} from '../controllers/costComponentMappingController';

async function costComponentMappingRoutes(fastify: FastifyInstance) {
    fastify.post('/costComponentMapping', async (request, reply) => {
        await createCostComponentMapping(request, reply);
    });
    fastify.get('/program/:program_id/costComponentMapping', getAllCostComponentMapping);
}

export default costComponentMappingRoutes;
