import { FastifyInstance } from 'fastify';
import {
  createPicklist,
  updatePicklistAndItem,
  deletePicklist,
  getPicklistById,
  getPicklistAndPicklistItem,
  getAllPickListByProgramId,
  createPicklistData,
  deletePredefinedPicklist
} from '../controllers/picklist.controller';
import { createPicklistSchema, paramsSchema, querySchema } from '../interfaces/picklist.interface';

async function picklistRoutes(fastify: FastifyInstance) {
  fastify.get('/program/:program_id/picklist', {
    schema: {
      querystring: querySchema,
    }
  }, getPicklistById);
  fastify.post('/program/:program_id/picklist', {
    schema: {
      body: createPicklistSchema,
    }
  }, createPicklist);
  fastify.put('/program/:program_id/picklist/:id', {
    schema: {
      body: createPicklistSchema,
      params: paramsSchema,
    }
  }, updatePicklistAndItem);
  fastify.post('/predefined-picklist', {
    schema: {
      body: createPicklistSchema,
    }
  }, createPicklistData);
  fastify.put('/program/:program_id/delete-picklist/:id', {
    schema: {
      params: paramsSchema
    }
  }, deletePicklist);
  fastify.get('/program/:program_id/picklist/:picklist_id', {
    schema: {
      params: paramsSchema,
      querystring: querySchema,
    }
  }, getPicklistAndPicklistItem);
  fastify.get('/get-all/pickList', {
    schema: {
      querystring: querySchema,
    }
  }, getAllPickListByProgramId)
  fastify.put('/delete-picklist/:id', {
    schema: {
      params: paramsSchema,
    }
  }, deletePredefinedPicklist);
}		


export default picklistRoutes;