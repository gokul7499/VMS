import { FastifyInstance } from 'fastify';
import { getAllReasoncode, getReasoncodeById, getReasoncodeByEventName, updateReasoncode, createReasoncode, deleteReasoncode, getReasonCodeBySlug } from '../controllers/reason-code.controller';

async function reasoncodeRoute(fastify: FastifyInstance) {
    fastify.post('/reason-code', createReasoncode);
    fastify.get('/reason-code', getAllReasoncode);
    fastify.get('/reason-code/:id', getReasoncodeById);
    fastify.get('/program/:program_id/reason-code', getReasonCodeBySlug);
    fastify.get('/reason-codes', getReasoncodeByEventName);
    fastify.put('/reason-code/:id', updateReasoncode);
    fastify.delete('/reason-code/:id', deleteReasoncode);
}

export default reasoncodeRoute;
