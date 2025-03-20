import { FastifyInstance } from 'fastify';
import * as RateTypeController from '../controllers/rate-type.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';

async function rateTypeRoutes(fastify: FastifyInstance) {
    fastify.post('/program/:program_id/rate_type', {
        preHandler: validatePermissions(Actions.CREATE, [Permissions.RATE_TYPE])
    }, RateTypeController.saveRateType);

    fastify.get('/program/:program_id/rate_type/get-all', {
        preHandler: validatePermissions(Actions.READ, [Permissions.RATE_TYPE])
    }, RateTypeController.getAllRateType);

    fastify.get('/program/:program_id/rate_type/:id', {
        preHandler: validatePermissions(Actions.READ, [Permissions.RATE_TYPE])
    }, RateTypeController.getRateTypeById);

    fastify.put('/program/:program_id/rate_type/:id', {
        preHandler: validatePermissions(Actions.UPDATE, [Permissions.RATE_TYPE])
    }, RateTypeController.updateRateTypeById);

    fastify.delete('/program/:program_id/rate_type/:id', {
        preHandler: validatePermissions(Actions.DELETE, [Permissions.RATE_TYPE])
    }, RateTypeController.deleteRateTypeById);

    fastify.get('/program/:program_id/differential_on', {
        preHandler: validatePermissions(Actions.READ, [Permissions.RATE_TYPE])
    }, RateTypeController.getDifferentialOnForRateType);

    fastify.get('/program/:program_id/get-all/shift', {
        preHandler: validatePermissions(Actions.READ, [Permissions.RATE_TYPE])
    }, RateTypeController.getShiftAndRateType);
}

export default rateTypeRoutes;
