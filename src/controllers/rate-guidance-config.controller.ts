
import { FastifyRequest, FastifyReply } from 'fastify';
import { RateGuidanceService } from '../service/rate-guidance.service';
const  rateGuidanceService = new  RateGuidanceService();
export class RateGuidanceController {
  // private service: RateGuidanceService;

  constructor() {
    // this.service = new RateGuidanceService();
  }

  async RateGuidance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = request.body as {
        program_id: string;
        is_enabled: boolean;
        rate_guidance_id?: string;
        rate_guidance: Array<{ event_name: string; is_enabled: boolean }>;
      };

      const result = await rateGuidanceService.process(payload);

      return reply.code(200).send({
        success: true,
        message: 'Rate guidance processed',
        response: {
          rate_guidance: {
            program_id: result.config.program_id,
            is_enable: result.config.dataValues.is_enable,
          },
          events: result.events.map(event => ({
            id: event.id,
            is_enabled: event.is_enabled,
            event_name: event.event_name,
          })),
        },
      });
    } catch (err) {
      console.error(err);
      return reply.code(500).send({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }

  async getRateGuidanceById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { rate_guidance_id } = request.params as { rate_guidance_id: string };

      if (!rate_guidance_id) {
        return reply.code(400).send({
          success: false,
          message: 'Missing rate_guidance_id',
        });
      }

      const result = await rateGuidanceService.getByRateGuidanceId(rate_guidance_id);

      if (!result) {
        return reply.code(404).send({
          success: false,
          message: 'Rate guidance not found for given ID',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Rate guidance processed',
        response: result,
      });
    } catch (err) {
      console.error('Error fetching rate guidance:', err);
      return reply.code(500).send({
        success: false,
        message: 'Internal Server Error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

