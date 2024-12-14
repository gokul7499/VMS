import { FastifyInstance } from 'fastify';
import { getReasoncode,getReasoncodeId,getReasoncodeByEventName, updateReasoncode,createReasoncode, deleteReasoncode,getReasonCodeByModuleEventName  } from '../controllers/reason-code.controller';

async function reasoncodeRoute(fastify: FastifyInstance) {
    fastify.post('/reason-code', createReasoncode);
    fastify.get('/program/:program_id/reason-code', getReasoncode);
    fastify.get('/program/:program_id/reason-code/:id', getReasoncodeId);
    fastify.get('/program/:program_id/reason-code/module-event-name', getReasonCodeByModuleEventName);
    fastify.get('/program/:program_id/reason-codes', getReasoncodeByEventName);
    fastify.put('/reason-code/:id', updateReasoncode);
    fastify.delete('/program/:program_id/reason-code/:id', deleteReasoncode);
}

export default reasoncodeRoute;
