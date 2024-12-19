
import { FastifyInstance } from "fastify";
import {
    getStateById,
    createState,
    deleteStatesById,
    updateStateById,
    getAllStatesByProgramId,
    createStateBulk
} from "../controllers/state.controller";
async function stateRoutes(fastify: FastifyInstance) {
    fastify.get("/state/:id", getStateById);
    fastify.post("/state", createState);
    fastify.post('/bulk-upload/state', createStateBulk)
    fastify.delete("/state/:id", deleteStatesById);
    fastify.put("/state/:id", updateStateById);
    fastify.get("/state", getAllStatesByProgramId)
}
export default stateRoutes;
