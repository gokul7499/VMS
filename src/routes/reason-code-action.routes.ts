import { FastifyInstance } from 'fastify';
import { getAllReasoncode, getReasoncodeById, getReasoncodeByEventName, updateReasoncode, createReasoncode, deleteReasoncode, getReasonCodeBySlug, getReasonCodeByProgramIdAndSlug,advancedFilterReasoncode } from '../controllers/reason-code-action.controller';
import { createReasoncodeSchema ,querySchema ,paramsSchema } from '../interfaces/reason-code.interface';
async function reasoncodeRoute(fastify: FastifyInstance) {
    fastify.post('/reason-code',{

        schema: {
            body: createReasoncodeSchema,
        }
    }, createReasoncode);

    fastify.get('/reason-code',{
        schema: {
            querystring: querySchema,
        }
    }, getAllReasoncode);
    fastify.get('/program/:program_id/reason-code/:id',{
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getReasoncodeById);
    fastify.get('/program/:program_id/reason-code', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    },getReasonCodeBySlug);
    fastify.get('/reason-codes',{
        schema: {
            querystring: querySchema,
        }
    }, getReasoncodeByEventName);
    fastify.put('/program/:program_id/reason-code/:id',{
        schema: {
            body: createReasoncodeSchema,
            querystring: querySchema,
        }
    }, updateReasoncode);
    fastify.delete('/reason-code/:id', deleteReasoncode);
    fastify.get('/reason_codes/:slug',{
        schema: {
            querystring: querySchema,
        }
    }, getReasonCodeByProgramIdAndSlug);
    fastify.post('/reason_codes-advanced-filter',{
        schema: {
            querystring: querySchema,
        }
    }, advancedFilterReasoncode);

}


export default reasoncodeRoute;
