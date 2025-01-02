
import { FastifyInstance } from "fastify";
import {
    createCheckList,
    getChecklistById,
    updateCheckList,
    deleteCheckList,
    filterChecklists,
} from "../controllers/checklist.controller";
async function checkListRoute(fastify: FastifyInstance) {
    fastify.post("/program/:program_id/check_list", createCheckList);
    fastify.get("/program/:program_id/entity_id/:entity_id", getChecklistById);
    fastify.put("/program/:program_id/entity_id/:entity_id", updateCheckList);
    fastify.delete("/program/:program_id/entity_id/:entity_id", deleteCheckList);
    fastify.get("/filter-checklists", filterChecklists);
}
export default checkListRoute;
