import { FastifyInstance } from 'fastify';
import {
  getModule,
  createModule,
} from '../controllers/moduleController';

async function moduleRouter(fastify: FastifyInstance) {
  fastify.get('/module', getModule);
  fastify.post('/module', createModule);
  // fastify.put('/module/:id', updateModule);
  // fastify.delete('/module/:id', deleteModule);
}

export default moduleRouter;