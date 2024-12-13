import { FastifyInstance } from 'fastify';
import {
  getModule,
  createModule,
} from '../controllers/module.controller';

async function moduleRouter(fastify: FastifyInstance) {
  fastify.get('/module', getModule);
  fastify.post('/module', createModule);
}

export default moduleRouter;