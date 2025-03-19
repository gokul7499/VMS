import { FastifyInstance } from 'fastify';
import {
    getWorkLocationById,
    createWorkLocation,
    updateWorkLocation,
    deleteWorkLocationById,
    getAllWorkLocations,
    getAllWorkLocationsCountry,
    getAllCountry,
    getWorkLocationsAdvancedFilter
} from '../controllers/work-location.controller';

async function workLocationRoutes(fastify: FastifyInstance) {
    fastify.post('/work-location', createWorkLocation);
    fastify.get('/program/:program_id/work-location', getAllWorkLocations)
    fastify.get('/program/:program_id/work-location/:id', getWorkLocationById);
    fastify.put('/work-location/:id', updateWorkLocation);
    fastify.delete('/program/:program_id/work-location/:id', deleteWorkLocationById);
    fastify.get('/program/:program_id/work-location-country', getAllWorkLocationsCountry);
    fastify.get('/program/:program_id/work-location-countries', getAllCountry);
    fastify.post('/program/:program_id/work-location-advanced-filter', getWorkLocationsAdvancedFilter)


}

export default workLocationRoutes;