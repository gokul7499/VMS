
import RateGuidance from '../models/rate-guidance.model';

class RateGuidanceRepository {
  rateGuidanceModel: any;
  constructor() {
    this.rateGuidanceModel = RateGuidance;
  }
  async createOrUpdateEvents(rate_guidance_id: string, rate_guidance: Array<{ event_name: string, is_enabled: boolean }>) {
    const result = [];

    for (const event of rate_guidance) {
      const [record, created] = await this.rateGuidanceModel.upsert({
        rate_guidance_id,
        event: event.event_name, // Map event_name from array to event in DB
        is_enabled: event.is_enabled
      }, { returning: true });
      result.push(record);
    }
    return result;
  }

async findEventsByRateGuidanceId(rate_guidance_id: string) {
  return await this.rateGuidanceModel.findAll({
    where: { rate_guidance_id },
    attributes: ['id', 'rate_guidance_id', 'event', 'is_enabled']
  });
}


}

const rateGuidanceRepository = new RateGuidanceRepository();
export default rateGuidanceRepository;

