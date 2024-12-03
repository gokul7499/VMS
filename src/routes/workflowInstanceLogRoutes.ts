import { FastifyInstance } from 'fastify';
import {
    createWorkflowInstanceLog,
    updateWorkflowInstanceLog,
    deleteWorkflowInstanceLog,
    getAllWorkflowInstanceLog,
    getWorkflowInstanceLogById
} from '../controllers/workflowInstanceLogController';

async function WorkflowInstanceLogRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/workflow-instance-log', async (request, reply) => { await createWorkflowInstanceLog(request, reply); });
    fastify.put('/program/:program_id/workflow-instance-log/:id', updateWorkflowInstanceLog);
    fastify.delete('/program/:program_id/workflow-instance-log/:id', deleteWorkflowInstanceLog);
    fastify.get('/program/:program_id/workflow-instance-log', getAllWorkflowInstanceLog);
    fastify.get('/program/:program_id/workflow-instance-log/:id', getWorkflowInstanceLogById);
}

export default WorkflowInstanceLogRoutes;
