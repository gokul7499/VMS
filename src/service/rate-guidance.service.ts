
import rateGuidanceConfigRepository from '../repositories/rate-guidance-config.repository';
import rateGuidanceRepository from '../repositories/rate-guidance.repository';

class RateGuidanceService {
  configRepo:any;
  eventRepo:any;

  constructor() {
    this.configRepo = rateGuidanceConfigRepository;
    this.eventRepo = rateGuidanceRepository;
  }

  async process(payload: {
    program_id: string,
    is_enabled: boolean,
    rate_guidance_id?: string,
    rate_guidance: Array<{ event_name: string, is_enabled: boolean }>
  }) {
    const config = await this.configRepo.createOrUpdate(payload.program_id, payload.is_enabled);

    if (!config) {
      throw new Error('Failed to create or update rate guidance config.');
    }
    const rate_guidance_id = payload.rate_guidance_id || config.id;
    const rawEvents = await this.eventRepo.createOrUpdateEvents(rate_guidance_id, payload.rate_guidance);


    const events = rawEvents.map((event:any) => ({
      id: event.id,
      rate_guidance_id: event.rate_guidance_id,
      is_enabled: event.is_enabled,
      event_name: event.event,
    }));

    return {
      config,
      events,
    };
  }

async getByRateGuidanceId(rate_guidance_id: string) {
  const config = await this.configRepo.findById(rate_guidance_id);
  if (!config) return null;

  const events = await this.eventRepo.findEventsByRateGuidanceId(rate_guidance_id);

  return {
    rate_guidance: {
      program_id: config.program_id ,
       is_enable: config.dataValues.is_enable,
    },
    events: events.map((event:any) => ({
      id: event.id,
      rate_guidance_id: event.rate_guidance_id,
      is_enabled: event.is_enabled,
      event: event.event
    }))
  };
}


}

export default RateGuidanceService;
