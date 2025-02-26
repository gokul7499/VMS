import { FastifyInstance } from 'fastify';
import { createSupportingText, getAllSupportingTexts, getSupportingText, updateSupportingText, deleteSupportingText } from '../controllers/supporting-text.controller';
import { createsupportingTextSchema, paramsSchema, querySchema } from '../interfaces/supporting-text.interface';

async function supportingTextRoutes(fastify: FastifyInstance) {
  fastify.post('/supporting-text', {
    schema: {
      body:createsupportingTextSchema,
  }
  },createSupportingText);
  fastify.get('/program/:program_id/supporting-text',
    {
      schema: {
        params: paramsSchema,
        querystring: querySchema,
    }
    }, getAllSupportingTexts);
  fastify.get('/program/:program_id/supporting-text/:id',{
    schema: {
      params: paramsSchema,
      querystring: querySchema,
  }
  } ,getSupportingText);
  fastify.put('/supporting-text/:id', {
    schema: {
      body:createsupportingTextSchema,
  }
  },updateSupportingText);
  fastify.delete('/program/:program_id/supporting-text/:id',{
    schema: {
      params: paramsSchema,
  }
  }, deleteSupportingText);
}

export default supportingTextRoutes;
