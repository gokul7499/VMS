import { FastifyInstance } from "fastify";
import  {RuleBuilderHierarchyMappingData} from "../interfaces/ruleBuilderHierarchyMappingInterface"
import {
  getDataById,
  createData,
  updateData,
  deleteData,
  searchData
} from "../controllers/ruleBuilderHierarchyMappingController";

async function ruleBuilderHeirarchyMappingRoutes(fastify: FastifyInstance) {
  fastify.get("/rule-builder-heirarchy-mapping/", searchData);
  fastify.get("/rule-builder-heirarchy-mapping/:id", getDataById);
  fastify.post("/rule-builder-heirarchy-mapping/", async (request, reply) => createData(request.body as RuleBuilderHierarchyMappingData, reply));
  fastify.put("/rule-builder-heirarchy-mapping/:id", updateData);
  fastify.delete("/rule-builder-heirarchy-mapping/:id", deleteData);
}

export default ruleBuilderHeirarchyMappingRoutes;