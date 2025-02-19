import { FastifyInstance } from 'fastify';
import {
  getModule,
  createModule,
} from '../controllers/module.controller';
import { createModuleSchema, paramsSchema} from '../interfaces/module.interface';


async function moduleRouter(fastify: FastifyInstance) {
  fastify.get('/module',{
    schema:{
      params:paramsSchema,
    }
  },
     getModule);
  fastify.post('/module',{
    schema:{
      body: createModuleSchema,

    }
  },
     createModule);
}

export default moduleRouter;