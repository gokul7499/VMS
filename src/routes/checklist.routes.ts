
import { FastifyInstance } from "fastify";
import {
    createCheckList,
    getChecklistById,
    updateCheckList,
    deleteCheckList,
    filterChecklists,
    listChecklists
} from "../controllers/checklist.controller";
async function checklistRoutes(fastify: FastifyInstance) {
    fastify.post("/program/:program_id/checklists", createCheckList);
    fastify.get("/program/:program_id/checklists/entity/:entity_id", getChecklistById);
    fastify.put("/program/:program_id/checklists/entity/:entity_id", updateCheckList);
    fastify.delete("/program/:program_id/checklists/entity/:entity_id", deleteCheckList);
    fastify.get("/program/:program_id/checklists/list/brief", listChecklists);
    fastify.get("/program/:program_id/checklists/filter", filterChecklists);
}
export default checklistRoutes;
