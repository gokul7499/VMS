import { FastifyInstance } from 'fastify';
import {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventSchemaById,
    getEvents
} from '../controllers/event.controller';

async function EventRoutes(fastify: FastifyInstance) {
    fastify.post('/supporting-text-event', createEvent);
    fastify.get('/module/:module_id/supporting-text-event', getEvents);
    fastify.get('/supporting-text-event', getAllEvents);
    fastify.get('/module/:module_id/supporting-text-event/:id', getEventById);
    fastify.put('/module/:module_id/supporting-text-event/:id', updateEvent);
    fastify.delete('/module/:module_id/supporting-text-event/:id', deleteEvent);
    fastify.get('/event-schema/module/:module_id/event/:event_id/schema', getEventSchemaById);
}
export default EventRoutes;