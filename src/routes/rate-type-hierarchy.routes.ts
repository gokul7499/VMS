import { FastifyInstance } from "fastify";
import { RateTypeHierarchyData } from "../interfaces/rate-type-hierarchy.interface";
import {
  getDataById,
  createData,
  updateData,
  deleteData,
  searchData
} from "../controllers/rate-type-hierarchy.controller";

async function rateTypeHierarchyRoutes(fastify: FastifyInstance) {
  fastify.get("/rate-type-heirarchy/", searchData);
  fastify.get("/rate-type-heirarchy/:id", getDataById);
  fastify.post("/rate-type-heirarchy/", async (request, reply) => createData(request.body as RateTypeHierarchyData, reply));
  fastify.put("/rate-type-heirarchy/:id", updateData);
  fastify.delete("/rate-type-heirarchy/:id", deleteData);
}

export default rateTypeHierarchyRoutes;