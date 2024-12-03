import { FastifyInstance } from "fastify";
import {
    getFoundationalData,
    getFoundationalDataById,
    createFoundationalData,
    updateFoundationalData,
    deleteFoundationalData
} from "../controllers/foundationalDataController";

async function foundationalDataRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/foundational_data', getFoundationalData);
    fastify.get('/program/:program_id/foundational_data/:id', getFoundationalDataById);
    fastify.post('/foundational_data', createFoundationalData);
    fastify.put('/program/:program_id/foundational_data/:id', updateFoundationalData);
    fastify.delete('/program/:program_id/foundational_data/:id', deleteFoundationalData);
}

export default foundationalDataRoutes;