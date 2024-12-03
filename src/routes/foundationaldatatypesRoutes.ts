import { FastifyInstance } from 'fastify';
import {
    createFoundationalDataTypes,
    updateFoundationalDataTypes,
    deleteFoundationalDataTypes,
    getAllFoundationalDataTypes,
    getFoundationalDataTypeById
} from '../controllers/foundationaldatatypesController';

async function foundationalDataTypeRoutes(fastify: FastifyInstance) {
    fastify.post('/foundational-datatypes', async (request, reply) => {
        await createFoundationalDataTypes(request, reply);
    });
    fastify.put('/program/:program_id/foundational-datatypes/:id', updateFoundationalDataTypes);
    fastify.delete('/program/:program_id/foundational-datatypes/:id', deleteFoundationalDataTypes);
    fastify.get('/program/:program_id/foundational-datatypes', getAllFoundationalDataTypes);
    fastify.get('/program/:program_id/foundational-datatypes/:id', getFoundationalDataTypeById);
}

export default foundationalDataTypeRoutes;
