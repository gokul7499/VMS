import { FastifyInstance } from 'fastify';
import {
    getIndustries,
    createIndustries,
    getIndustriesById,
    updateIndustries,
    deleteIndustries,
    bulkUploadIndustries
} from '../controllers/industriesController';

async function industriesRoutes(fastify: FastifyInstance) {
    fastify.post('/industries', createIndustries);
    fastify.post('/industries/bulk-upload', bulkUploadIndustries);
    fastify.get('/program/:program_id/industries', getIndustries);
    fastify.get('/program/:program_id/industries/:id', getIndustriesById);
    fastify.put('/industries/:id', updateIndustries);
    fastify.delete('/program/:program_id/industries/:id', deleteIndustries);
}
export default industriesRoutes;
