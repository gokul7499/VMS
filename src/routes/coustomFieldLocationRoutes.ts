
import { FastifyInstance } from 'fastify';
import {
    getCustomFieldLocationById,
    createCustomFieldLocation,
    deleteCustomFieldLocationById,
    updateCustomFieldLocationById,
    getAllCustomFieldLocation,
} from '../controllers/customFieldLocationController';
async function customFieldLocationRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/custom_field_location/:id', getCustomFieldLocationById);
    fastify.post('/custom_field_location', createCustomFieldLocation);
    fastify.delete('/program/:program_id/custom_field_location/:id', deleteCustomFieldLocationById);
    fastify.put('/program/:program_id/custom_field_location/:id', updateCustomFieldLocationById);
    fastify.get('/program/:program_id/custom_field_location', getAllCustomFieldLocation)
}
export default customFieldLocationRoutes;
