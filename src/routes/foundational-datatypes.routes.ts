import { FastifyInstance } from 'fastify';
import {
    createFoundationalDataTypes,
    updateFoundationalDataTypes,
    deleteFoundationalDataTypes,
    getAllFoundationalDataTypes,
    getFoundationalDataTypeById,
    getAllFoundationalDataTypesAdvancedFilter
} from '../controllers/foundational-datatypes.controller';
import { createFoundationalDataTypeSchema, paramsSchema, querySchema } from '../interfaces/foundational-datatypes.interface';

async function foundationalDataTypeRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/foundational-datatypes', {
        schema: {
            body: createFoundationalDataTypeSchema,
            params: paramsSchema,
        }
    }, async (request, reply) => {
        await createFoundationalDataTypes(request, reply);
    });
    fastify.put('/program/:program_id/foundational-datatypes/:id', {
        schema: {
            body: createFoundationalDataTypeSchema,
            params: paramsSchema,
        }
    }, updateFoundationalDataTypes);
    fastify.delete('/program/:program_id/foundational-datatypes/:id', {
        schema: {
            params: paramsSchema,
        }
    }, deleteFoundationalDataTypes);
    fastify.get('/program/:program_id/foundational-datatypes', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,

        }
    }, getAllFoundationalDataTypes);
    fastify.get('/program/:program_id/foundational-datatypes/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,

        }
    }, getFoundationalDataTypeById);

    fastify.post('/program/:program_id/foundational-datatypes-advanced-filter', {
        schema: {
            params: paramsSchema,
        }
    }, getAllFoundationalDataTypesAdvancedFilter);
}

export default foundationalDataTypeRoutes;
