import { FastifyInstance } from "fastify";
import {
  getQualificationTypes,
  getQualificationTypeById,
  createQualificationTypes,
  updateQualificationTypes,
  deleteQualificationTypes,
} from "../controllers/qualificationTypeController";

async function qualificationTypeRouter(fastify: FastifyInstance) {
  fastify.get('/program/:program_id/qualification-type', getQualificationTypes);
  fastify.get('/program/:program_id/qualification-type/:id', getQualificationTypeById);
  fastify.post('/program/:program_id/qualification-type', createQualificationTypes);
  fastify.put('/program/:program_id/qualification-type/:id', updateQualificationTypes);
  fastify.delete('/program/:program_id/qualification-type/:id', deleteQualificationTypes);
}

export default qualificationTypeRouter;
