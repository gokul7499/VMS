import { FastifyInstance } from "fastify";
import { RuleBuilderDecisionTableData } from "../interfaces/ruleBuilderDecisionTableInterface";
import {
  updateDataWithRuleId,
  getDataById,
  createData,
  updateData,
  deleteData,
  searchData,
  generateExcel,
  createRule
} from "../controllers/ruleBuilderDecisionTableController";

async function ruleBuilderDecisionTableRoutes(fastify: FastifyInstance) {
  fastify.get("/rule-builder-decision-table/", searchData);
  fastify.get("/program/:program_id/rule-builder-decision-table/:rule_id", getDataById);
  fastify.post("/program/:program_id/rule-builder-decision-table/", async (request, reply) => createData(request.body as RuleBuilderDecisionTableData, reply));
  fastify.put("/rule-builder-decision-table/:id", updateData);
  fastify.put("/program/:program_id/rule-builder-decision-table/:rule_id", updateDataWithRuleId);
  fastify.delete("/rule-builder-decision-table/:id", deleteData);
  fastify.get("/rule-builder-decision-table/program/:program_id/generate-excel/:rule_id", generateExcel);
  fastify.post("/rule-builder-decision-table/rule-consumption-api", async (request, reply) => createRule(request.body as RuleBuilderDecisionTableData, reply));
}

export default ruleBuilderDecisionTableRoutes