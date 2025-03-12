import { FastifyInstance } from "fastify";
import {
  createRateCard,
  getAllRateCards,
  getRateCardById,
  updateRateCard,
  deleteRateCard,
  advanceFilterRateCards
} from "../controllers/rate-card.controller";

async function rateCardsRoutes(fastify: FastifyInstance) {
  fastify.post("/program/:program_id/rate-card", createRateCard);
  fastify.get("/program/:program_id/rate-card", getAllRateCards);
  fastify.post("/program/:program_id/rate-card/advance-filter", advanceFilterRateCards);
  fastify.get("/program/:program_id/rate-card/:id", getRateCardById);
  fastify.put("/program/:program_id/rate-card/:id", updateRateCard);
  fastify.delete("/program/:program_id/rate-card/:id", deleteRateCard);
}

export default rateCardsRoutes;
