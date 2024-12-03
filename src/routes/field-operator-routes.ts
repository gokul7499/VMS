import { FastifyInstance } from 'fastify';
import {
    createFieldOperator,
    updateFieldOperator,
    deleteFieldOperator,
    getAllFieldOperator,
    getFieldOperatorById,
} from '../controllers/field-operator-controller';

async function fieldOperatorRoutes(fastify: FastifyInstance) {
    fastify.post('/field-operator', async (request, reply) => {
        await createFieldOperator(request, reply);
    });
    fastify.put('/field-operator/:id', updateFieldOperator);
    fastify.delete('/field-operator/:id', deleteFieldOperator);
    fastify.get('/field-operators', getAllFieldOperator);
    fastify.get('/field-operator/:id', getFieldOperatorById);
}

export default fieldOperatorRoutes;
