import { FastifyInstance } from 'fastify';
import {
    createWorkflowInstance,
    updateWorkflowInstance,
    deleteWorkflowInstance,
    getAllWorkflowInstance,
    getWorkflowInstanceById
} from '../controllers/workflowInstanceController';

async function WorkflowInstanceRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/workflow-instance', async (request, reply) => { await createWorkflowInstance(request, reply); });
    fastify.put('/program/:program_id/workflow-instance/:id', updateWorkflowInstance);
    fastify.delete('/program/:program_id/workflow-instance/:id', deleteWorkflowInstance);
    fastify.get('/program/:program_id/workflow-instance', getAllWorkflowInstance);
    fastify.get('/program/:program_id/workflow-instance/:id', getWorkflowInstanceById);
}

export default WorkflowInstanceRoutes;
