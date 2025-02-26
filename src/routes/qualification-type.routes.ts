import { FastifyInstance } from "fastify";
import {
  getQualificationTypes,
  getQualificationTypeById,
  createQualificationTypes,
  updateQualificationTypes,
  deleteQualificationTypes,
  getQualificationValueMaster,
  createQualificationsInBulk,
  getQualificationById,
  updateQualificationById
} from "../controllers/qualification-type.controller";

async function qualificationTypeRouter(fastify: FastifyInstance) {
  fastify.get('/program/:program_id/qualification-type', getQualificationTypes);
  fastify.get('/program/:program_id/qualification-type/:id', getQualificationTypeById);
  fastify.post('/program/:program_id/qualification-type', createQualificationTypes);
  fastify.put('/program/:program_id/qualification-type/:id', updateQualificationTypes);
  fastify.delete('/program/:program_id/qualification-type/:id', deleteQualificationTypes);
  fastify.get('/qualification-value', getQualificationValueMaster);
  fastify.post('/program/:program_id/qualifications-data-import', createQualificationsInBulk);
  fastify.get('/program/:program_id/qualification/:id', getQualificationById);
  fastify.put('/program/:program_id/qualification/:id', updateQualificationById);
}

export default qualificationTypeRouter;


