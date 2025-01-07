import { FastifyInstance } from 'fastify';
import { getAllReasoncode, getReasoncodeById, getReasoncodeByEventName, updateReasoncode, createReasoncode, deleteReasoncode, getReasonCodeBySlug, getReasonCodeByProgramIdAndSlug } from '../controllers/reason-code-action.controller';

async function reasoncodeRoute(fastify: FastifyInstance) {
    fastify.post('/reason-code', createReasoncode);
    fastify.get('/reason-code', getAllReasoncode);
    fastify.get('/program/:program_id/reason-code/:id', getReasoncodeById);
    fastify.get('/program/:program_id/reason-code', getReasonCodeBySlug);
    fastify.get('/reason-codes', getReasoncodeByEventName);
    fastify.put('/program/:program_id/reason-code/:id', updateReasoncode);
    fastify.delete('/reason-code/:id', deleteReasoncode);
    fastify.get('/reason_codes/:slug', getReasonCodeByProgramIdAndSlug);
}

export default reasoncodeRoute;
