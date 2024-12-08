import { FastifyInstance } from "fastify";
import {
  getConfigurationById,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
  getProgramConfigurations,
  getTransformedConfig,
  getConfigByProgramIdAndTitles
} from "../controllers/programConfigController";

async function programsConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/program/:program_id/program-config/:id", getConfigurationById);
  fastify.get("/program/:program_id/configurations", getConfigByProgramIdAndTitles);
  fastify.post("/program-config", createConfiguration);
  fastify.put("/program/:program_id/program-config", updateConfiguration);
  fastify.delete("/program/:program_id/program-config/:id", deleteConfiguration);
  fastify.get("/program/:program_id/program-config", getProgramConfigurations);
  fastify.get("/program/:program_id/program-configuration", getTransformedConfig);
}

export default programsConfigRoutes;