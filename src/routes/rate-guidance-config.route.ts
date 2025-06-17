
import { FastifyInstance } from 'fastify';
import rateGuidanceController from '../controllers/rate-guidance-config.controller';

export async function rateGuidanceConfigRoutes(fastify: FastifyInstance) {
  fastify.post('/rate-guidance', rateGuidanceController.RateGuidance);
  fastify.get('/rate-guidance/:rate_guidance_id', rateGuidanceController.getRateGuidanceById);
}

