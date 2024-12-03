import { FastifyInstance } from 'fastify';
import {
  createPicklist,
  updatePicklistAndItem,
  deletePicklist,
  getPicklistById,
  getPicklistAndPicklistItem,
  getAllPickListByProgramId
} from '../controllers/picklistController';

async function picklistRoutes(fastify: FastifyInstance) {
  fastify.get('/program/:program_id/picklist', getPicklistById);
  fastify.post('/program/:program_id/picklist', createPicklist);
  fastify.put('/program/:program_id/picklist/:id', updatePicklistAndItem);
  fastify.delete('/program/:program_id/picklist/:id', deletePicklist);
  fastify.get('/program/:program_id/picklist/:picklist_id', getPicklistAndPicklistItem);
  fastify.get('/get-all/pickList', getAllPickListByProgramId)
}

export default picklistRoutes;