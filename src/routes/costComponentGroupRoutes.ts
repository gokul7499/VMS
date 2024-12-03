import { FastifyInstance } from 'fastify';
import {
    createCostComponentGroup,
    updateCostComponentGroup,
    deleteCostComponentGroup,
    getAllCostComponentGroups,
    getCostComponentGroupById
} from '../controllers/costComponentGroupController';

async function costComponentGroupRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/costComponentGroup', async (request, reply) => { await createCostComponentGroup(request, reply); });
    fastify.put('/program/:program_id/costComponentGroup/:id', updateCostComponentGroup);
    fastify.delete('/program/:program_id/costComponentGroup/:id', deleteCostComponentGroup);
    fastify.get('/program/:program_id/costComponentGroup', getAllCostComponentGroups);
    fastify.get('/program/:program_id/costComponentGroup/:id', getCostComponentGroupById);
}

export default costComponentGroupRoutes;
