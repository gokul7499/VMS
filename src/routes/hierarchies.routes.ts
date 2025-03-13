import { FastifyInstance } from 'fastify';
import {
    getHierarchiesById, createHierarchies, updateHierarchies, deleteHierarchies, advancedSearchHierarchies, searchHierarchies,
    getHierarchiesByProgram, getHierarchies, getRateModel,getVendorMarkup,updateIsNotEditableFlag,getUserHierarchies,getHierarchiesAdvancedFilter
} from '../controllers/hierarchies.controller';

async function hierarchiesRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/hierarchies/:id', getHierarchiesById);
    fastify.post('/program/:program_id/hierarchies', createHierarchies);
    fastify.put('/program/:program_id/hierarchies/:id', updateHierarchies);
    fastify.delete('/hierarchies/:id', deleteHierarchies);
    fastify.get('/program/:program_id/hierarchies/', searchHierarchies);
    fastify.post('/program/:program_id/hierarchies/advance_search', advancedSearchHierarchies);
    fastify.get('/program/:program_id/hierarchies', getHierarchiesByProgram);
    fastify.get('/program/:program_id/hierarchies/get-all', getHierarchies);
    fastify.get('/program/:program_id/get-rate-model', getRateModel);
    fastify.get('/program/:program_id/get-vendor-markup', getVendorMarkup);
    fastify.put('/program/:program_id/update-hierarchy', updateIsNotEditableFlag);
    fastify.get('/program/:program_id/hierarchies/user', getUserHierarchies);
    fastify.post('/program/:program_id/hierarchies/advance-filter', getHierarchiesAdvancedFilter);
}
export default hierarchiesRoutes;
