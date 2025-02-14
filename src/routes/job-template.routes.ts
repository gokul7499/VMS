import { FastifyInstance } from "fastify";
import {
  getAllJobTemplates,
  getJobTemplateById,
  createJobTemplate,
  updateJobTemplate,
  deleteJobTemplate,
  getJobTemplatesByHierarchies,
  getAllJobTemplateHierarchyById,
  getMostUsedJobTemplates,
  getAllJobTempletsByHierarchies,
  findJobTemplatesByHierarchyIds,
  findJobTemplatesByLabourCategories,
  getCommonHierarchies,
  uploadFile,
} from "../controllers/job-template.controller";
import fastifyMultipart from "@fastify/multipart";
async function jobTemplate(fastify: FastifyInstance) {
  fastify.register(fastifyMultipart);
  fastify.get("/program/:program_id/job-template", getAllJobTemplates);
  fastify.get("/program/:program_id/job-template/:id", getJobTemplateById);
  fastify.post("/program/:program_id/job-template", createJobTemplate);
  fastify.put("/program/:program_id/job-template/:id", updateJobTemplate);
  fastify.delete("/program/:program_id/job-template/:id", deleteJobTemplate);
  fastify.post("/program/:program_id/get-job-templates", getJobTemplatesByHierarchies);
  fastify.get("/program/:program_id/recent-job-templates", getAllJobTemplateHierarchyById);
  fastify.get("/program/:program_id/popular-job-templates", getMostUsedJobTemplates);
  fastify.get(
    "/program/:program_id/job-templates",
    getAllJobTempletsByHierarchies
  );
  fastify.get(
    "/program_id/:program_id/job-templates/labour-categories",
    findJobTemplatesByLabourCategories
  );
  fastify.post(
    "/program/:program_id/job-templates-by-hierarchy",
    findJobTemplatesByHierarchyIds
  );
  fastify.get(
    "/program/:program_id/common-hierarchies",
    getCommonHierarchies
  );
  fastify.post("/upload-file", uploadFile);
}
export default jobTemplate;
