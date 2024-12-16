import { FastifyInstance } from 'fastify';
import {
    deleteShiftType,
    updateShiftType,
    createShiftType,
    getShiftTypeById,
    getALLShiftType,
    getShiftTypesByHierarchies,
    getShiftCategories
} from '../controllers/shift-type.controller';

export default async function shiftTypeRoutes(fastify: FastifyInstance) {
    fastify.post('/shift-type', createShiftType);
    fastify.get('/program/:program_id/shift-type', getALLShiftType);
    fastify.get('/program/:program_id/shift-type/:id', getShiftTypeById);
    fastify.put('/program/:program_id/shift-type/:id', updateShiftType);
    fastify.delete('/program/:program_id/shift-type/:id', deleteShiftType);
    fastify.get('/program/:program_id/shift-types-by-hierarchies', getShiftTypesByHierarchies);
    fastify.get('/program/:program_id/shift-category', getShiftCategories);
}
