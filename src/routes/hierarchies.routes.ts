import { FastifyInstance } from 'fastify';
import {
    getHierarchiesById, createHierarchies, updateHierarchies, deleteHierarchies, advancedSearchHierarchies, searchHierarchies,
    getHierarchiesByProgram, getHierarchies, getRateModel, getMasterDataForHeirarchies
} from '../controllers/hierarchies.controller';

async function hierarchiesRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/hierarchies/:id', getHierarchiesById);
    fastify.post('/hierarchies', createHierarchies);
    fastify.put('/hierarchies/:id', updateHierarchies);
    fastify.delete('/hierarchies/:id', deleteHierarchies);
    fastify.get('/program/:program_id/hierarchies/', searchHierarchies);
    fastify.post('/program/:program_id/hierarchies/advance_search', advancedSearchHierarchies);
    fastify.get('/program/:program_id/hierarchies', getHierarchiesByProgram);
    fastify.get('/program/:program_id/hierarchies/get-all', getHierarchies);
    fastify.get('/program/:program_id/get-rate-model', getRateModel);
    fastify.get('/program/:program_id/get-hierarchy-master-data', getMasterDataForHeirarchies);
}
export default hierarchiesRoutes;
