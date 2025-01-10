import { FastifyInstance } from "fastify";
import {
  saveProgram,
  getAllProgram,
  getProgramById,
  updateProgramById,
  deleteProgramById,
  advancedFilter,
} from "../controllers/programs.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";

async function programsRoutes(fastify: FastifyInstance) {
  fastify.post("/program/", saveProgram);
  fastify.get("/program/get-all", getAllProgram);
  fastify.get("/program/getbyid/:id", getProgramById);
  fastify.put("/program/:id", updateProgramById);
  fastify.delete("/program/:id", {
    preHandler: validatePermissions,
    config: {
      permissions: [Permissions.PROGRAM],
      action: Actions.CREATE,
    },
  }, deleteProgramById);
  fastify.get("/program/advanced-filters", advancedFilter);
}
export default programsRoutes;