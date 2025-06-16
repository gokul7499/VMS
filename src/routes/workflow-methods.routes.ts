import { FastifyInstance } from 'fastify';
import {
    createWorkflowMethod,
    updateWorkflowMethod,
    deleteWorkflowMethod,
    getAllWorkflowMethods,
    getWorkflowMethodById,
    getWorkflowMethods,
    getWorkflowMethod
} from '../controllers/workflow-methods.controller';
import { verifyToken } from '../middlewares/verifyToken';

async function WorkflowMethodRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/workflow-method', async (request, reply) => {
        await createWorkflowMethod(request, reply);
    });
    fastify.put('/workflow-method/:id', updateWorkflowMethod);
    fastify.delete('/workflow-method/:id', deleteWorkflowMethod);
    fastify.get('/workflow-methods', getAllWorkflowMethods);
    fastify.get('/workflow-method', getWorkflowMethods);
    fastify.get('/workflow-method/:id', getWorkflowMethodById);
    fastify.get('/get-workflow-method', getWorkflowMethod);
}

export default WorkflowMethodRoutes;
