import { FastifyInstance } from "fastify";
import { RateTypeJobTemplateData } from "../interfaces/rateTypeJobTemplateInterface";
import {
  getDataById,
  createData,
  updateData,
  deleteData,
  searchData
} from "../controllers/rateTypeHierarchyController";

async function rateTypeJobTemplateRoutes(fastify: FastifyInstance) {
  fastify.get("/rate-type-job-template/", searchData);
  fastify.get("/rate-type-job-template/:id", getDataById);
  fastify.post("/rate-type-job-template/", async (request, reply) => createData(request.body as RateTypeJobTemplateData, reply));
  fastify.put("/rate-type-job-template/:id", updateData);
  fastify.delete("/rate-type-job-template/:id", deleteData);
}

export default rateTypeJobTemplateRoutes;