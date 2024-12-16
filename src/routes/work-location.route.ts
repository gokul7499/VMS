import { FastifyInstance } from 'fastify';
import {
    getWorkLocationById,
    createWorkLocation,
    updateWorkLocation,
    deleteWorkLocationById,
    getAllWorkLocations,
    getAllWorkLocationsCountry
} from '../controllers/work-location.controller';

async function workLocationRoutes(fastify: FastifyInstance) {
    fastify.post('/work-location', createWorkLocation);
    fastify.get('/program/:program_id/work-location', getAllWorkLocations)
    fastify.get('/program/:program_id/work-location/:id', getWorkLocationById);
    fastify.put('/work-location/:id', updateWorkLocation);
    fastify.delete('/program/:program_id/work-location/:id', deleteWorkLocationById);
    fastify.get('/program/:program_id/work-location-country', getAllWorkLocationsCountry);
}

export default workLocationRoutes;