import { FastifyInstance } from "fastify";
import {
    getFoundationalData,
    getFoundationalDataById,
    createFoundationalData,
    updateFoundationalData,
    deleteFoundationalData
} from "../controllers/foundational-data.controller";
import { createFoundationalDataSchema, paramsSchema, querySchema } from "../interfaces/foundational-data.interface";
async function foundationalDataRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/foundational_data', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getFoundationalData);
    fastify.get('/program/:program_id/foundational_data/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getFoundationalDataById);
    fastify.post('/foundational_data', {
        schema: {
            body: createFoundationalDataSchema,
        }
    }, createFoundationalData);
    fastify.put('/program/:program_id/foundational_data/:id', {
        schema: {
            body: createFoundationalDataSchema,
            params: paramsSchema,
        }
    }, updateFoundationalData);
    fastify.delete('/program/:program_id/foundational_data/:id', {
        schema: {
            params: paramsSchema,
        }
    }, deleteFoundationalData);
}

export default foundationalDataRoutes;