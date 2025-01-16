import { FastifyInstance } from "fastify";
import {
  getConfigurationById,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
  getProgramConfigurations,
  getTransformedConfig,
  getConfigByProgramIdAndTitles
} from "../controllers/program-config.controller";
import { Permissions,Actions } from "../constants/permissions";
import { validatePermissions } from "../middlewares/vaildate-permissions";

async function programsConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/program/:program_id/program-config/:id",{
    preHandler: validatePermissions,
    config: {
      permissions: [Permissions.PROGRAM_CONFIGURATION],
      action: Actions.READ,
    },
  }, getConfigurationById);
  fastify.get("/program/:program_id/configurations",{
    preHandler: validatePermissions,
    config: {
      permissions: [Permissions.PROGRAM_CONFIGURATION],
      action: Actions.READ,
    },
  }, getConfigByProgramIdAndTitles);
  fastify.post("/program-config", createConfiguration);
  fastify.put("/program/:program_id/program-config",{
    preHandler: validatePermissions,
    config: {
      permissions: [Permissions.PROGRAM_CONFIGURATION],
      action: Actions.UPDATE,
    },
  }, updateConfiguration);
  fastify.delete("/program/:program_id/program-config/:id",{
    preHandler: validatePermissions,
    config: {
      permissions: [Permissions.PROGRAM_CONFIGURATION],
      action: Actions.DELETE,
    },
  }, deleteConfiguration);
  fastify.get("/program/:program_id/program-config",{
    preHandler: validatePermissions,
    config: {
      permissions: [Permissions.PROGRAM_CONFIGURATION],
      action: Actions.READ,
    },
  }, getProgramConfigurations);
  fastify.get("/program/:program_id/program-configuration",{
    preHandler: validatePermissions,
    config: {
      permissions: [Permissions.PROGRAM_CONFIGURATION],
      action: Actions.READ,
    },
  }, getTransformedConfig);
}

export default programsConfigRoutes;