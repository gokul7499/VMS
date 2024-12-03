import { FastifyInstance } from "fastify";
import { RateTypeHierarchyData } from "../interfaces/rateTypeHierarchyInterface";
import {
  getDataById,
  createData,
  updateData,
  deleteData,
  searchData
} from "../controllers/rateTypeHierarchyController";

async function rateTypeHierarchyRoutes(fastify: FastifyInstance) {
  fastify.get("/rate-type-heirarchy/", searchData);
  fastify.get("/rate-type-heirarchy/:id", getDataById);
  fastify.post("/rate-type-heirarchy/", async (request, reply) => createData(request.body as RateTypeHierarchyData, reply));
  fastify.put("/rate-type-heirarchy/:id", updateData);
  fastify.delete("/rate-type-heirarchy/:id", deleteData);
}

export default rateTypeHierarchyRoutes;