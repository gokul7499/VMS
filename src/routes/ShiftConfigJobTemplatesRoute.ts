import { FastifyInstance } from "fastify";
import {
  createShiftConfigJobTemplate,
  getShiftConfigJobTemplates,
  deleteShiftConfigJobTemplate
} from "../controllers/ShiftConfigJobTemplatesController";
 
export default async function resourceShiftConfigJobTemplateRoutes(fastify: FastifyInstance) {
  fastify.post("/shift-config-job-templates", createShiftConfigJobTemplate);
  fastify.get("/shift-config-job-templates", getShiftConfigJobTemplates);
  fastify.delete("/shift-config-job-templates/:id", deleteShiftConfigJobTemplate);
}