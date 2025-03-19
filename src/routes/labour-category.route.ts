import { FastifyInstance } from 'fastify';
import * as  lebourCategoryController from '../controllers/labour-category.controller';
import { bulkUploadIndustriesSchema, createIndustriesSchema, paramsSchema, querySchema } from '../interfaces/labour-category.interface';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";

async function industriesRoutes(fastify: FastifyInstance) {

    fastify.post('/industries', {
        preHandler: validatePermissions(Actions.CREATE, [Permissions.LABOUR_CATEGORY]),
        schema: {
            body: createIndustriesSchema
        }
    }, lebourCategoryController.createIndustries);

    fastify.post('/industries/bulk-upload', {
        preHandler: validatePermissions(Actions.CREATE, [Permissions.LABOUR_CATEGORY]),
        schema: {
            body: bulkUploadIndustriesSchema,
        }
    }, lebourCategoryController.bulkUploadIndustries);

    fastify.get('/program/:program_id/industries', {
        preHandler: validatePermissions(Actions.READ, [Permissions.LABOUR_CATEGORY]),
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, lebourCategoryController.getIndustries);

    fastify.get('/program/:program_id/industries/:id', {
        preHandler: validatePermissions(Actions.READ, [Permissions.LABOUR_CATEGORY]),
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, lebourCategoryController.getIndustriesById);

    fastify.put('/industries/:id', {
        preHandler: validatePermissions(Actions.UPDATE, [Permissions.LABOUR_CATEGORY]),
        schema: {
            body: createIndustriesSchema,
        }
    }, lebourCategoryController.updateIndustries);

    fastify.delete('/program/:program_id/industries/:id', {
        schema: {
            params: paramsSchema
        }
    }, lebourCategoryController.deleteIndustries);

}

export default industriesRoutes;