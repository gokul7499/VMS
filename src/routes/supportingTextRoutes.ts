import { FastifyInstance } from 'fastify';
import { createSupportingText, getAllSupportingTexts, getSupportingText, updateSupportingText, deleteSupportingText } from '../controllers/supportingTextController';

async function supportingTextRoutes(fastify: FastifyInstance) {
  fastify.post('/supporting-text', createSupportingText);
  fastify.get('/program/:program_id/supporting-text', getAllSupportingTexts);
  fastify.get('/program/:program_id/supporting-text/:id', getSupportingText);
  fastify.put('/supporting-text/:id', updateSupportingText);
  fastify.delete('/program/:program_id/supporting-text/:id', deleteSupportingText);
}

export default supportingTextRoutes;
