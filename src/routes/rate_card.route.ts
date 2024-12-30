import { FastifyInstance } from "fastify";
import {
  createRateCard,
  getAllRateCards,
  getRateCardById,
  updateRateCard,
  deleteRateCard,
} from "../controllers/rate-card.controller";

async function rateCardsRoutes(fastify: FastifyInstance) {
  fastify.post("/program/:program_id/rate-cards", createRateCard);
  fastify.get("/program/:program_id/rate-cards", getAllRateCards);
  fastify.get("/program/:program_id/rate-cards/:id", getRateCardById);
  fastify.put("/program/:program_id/rate-cards/:id", updateRateCard);
  fastify.delete("/program/:program_id/rate-cards/:id", deleteRateCard);
}

export default rateCardsRoutes;
