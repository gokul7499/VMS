import { FastifyInstance } from 'fastify';
import {
    createWorkflowMethod,
    updateWorkflowMethod,
    deleteWorkflowMethod,
    getAllWorkflowMethods,
    getWorkflowMethodById,
    getWorkflowMethods,
    getWorkflowMethod
} from '../controllers/workflowMethodsController';

async function WorkflowMethodRoutes(fastify: FastifyInstance) {
    fastify.post('/workflow-method', async (request, reply) => {
        await createWorkflowMethod(request, reply);
    });
    fastify.put('/workflow-method/:id', updateWorkflowMethod);
    fastify.delete('/workflow-method/:id', deleteWorkflowMethod);
    fastify.get('/workflow-methods', getAllWorkflowMethods);
    fastify.get('/workflow-method', getWorkflowMethods);
    fastify.get('/workflow-method/:id', getWorkflowMethodById);
    fastify.get('/job-workflow-method', getWorkflowMethod);
}

export default WorkflowMethodRoutes;
