import { FastifyInstance } from "fastify";
import * as FoundationalDataController from "../controllers/master-data.controller";
import { createFoundationalDataSchema, paramsSchema, querySchema } from "../interfaces/master-data.interface";
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';

async function foundationalDataRoutes(fastify: FastifyInstance) {

    fastify.get('/program/:program_id/foundational_data', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.MASTER_DATA])
    }, FoundationalDataController.getFoundationalData);

    fastify.get('/program/:program_id/foundational_data/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.MASTER_DATA])
    }, FoundationalDataController.getFoundationalDataById);

    fastify.post('/program/:program_id/foundational_data', {
        schema: {
            body: createFoundationalDataSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.MASTER_DATA])
    }, FoundationalDataController.createFoundationalData);

    fastify.put('/program/:program_id/foundational_data/:id', {
        schema: {
            body: createFoundationalDataSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.MASTER_DATA])
    }, FoundationalDataController.updateFoundationalData);

    fastify.delete('/program/:program_id/foundational_data/:id', {
        schema: {
            params: paramsSchema,
        }
    }, FoundationalDataController.deleteFoundationalData);
    
    fastify.post('/program/:program_id/foundational_data/advance-filter', {
    }, FoundationalDataController.foundationalDataFilter);
    

}

export default foundationalDataRoutes;