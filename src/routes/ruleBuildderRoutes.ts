import { FastifyInstance } from 'fastify';
import {
  getRuleById,
  createRule,
  updateRuleById,
  deleteRuleById,
  searchRule,
  getAllRules,
} from '../controllers/ruleBuilderController';
async function ruleBuilderRoutes(fastify: FastifyInstance) {
  fastify.get('/program/:program_id/rule-builder/:id', getRuleById);
  fastify.put('/program/:program_id/rule-builder/:id', updateRuleById);
  fastify.delete('/program/:program_id/rule-builder/:id', deleteRuleById);
  fastify.get('/program/:program_id/rule-builder/search', searchRule)
  fastify.post('/program/:program_id/rule-builder', createRule);
  fastify.get('/program/:program_id/rule-builder/all', getAllRules);
}

export default ruleBuilderRoutes;
