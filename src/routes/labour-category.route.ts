import { FastifyInstance } from 'fastify';
import {
    getIndustries,
    createIndustries,
    getIndustriesById,
    updateIndustries,
    deleteIndustries,
    bulkUploadIndustries,
    labourCategoryFilter
} from '../controllers/labour-category.controller';
import { bulkUploadIndustriesSchema, createIndustriesSchema, paramsSchema, querySchema } from '../interfaces/labour-category.interface';

async function industriesRoutes(fastify: FastifyInstance) {
    fastify.post('/industries', {
          schema: {
                body: createIndustriesSchema,
            }
    },createIndustries);
    fastify.post('/industries/bulk-upload',{
        schema: {
            body: bulkUploadIndustriesSchema,
        }
    }, bulkUploadIndustries);
    fastify.get('/program/:program_id/industries',{
          schema: {
                params: paramsSchema,
                querystring: querySchema,
            }
    }, getIndustries);
    fastify.get('/program/:program_id/industries/:id',{
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getIndustriesById);
    fastify.put('/industries/:id',{
        schema: {
            body: createIndustriesSchema,
        }
    } ,updateIndustries);
    fastify.delete('/program/:program_id/industries/:id',{
        schema: {
            params: paramsSchema
        }
    }, deleteIndustries);
    fastify.post('/program/:program_id/labour-category/advanced-filter',{
        schema: {
            params: paramsSchema,
        }
    }, labourCategoryFilter);
}
export default industriesRoutes;
