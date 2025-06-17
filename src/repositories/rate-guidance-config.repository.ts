
import RateGuidanceConfig from '../models/rate-guidance-config.model';
import { RateGuidanceConfigPayload } from '../interfaces/rate-guidance-config.interface';
import RateGuidance from '../models/rate-guidance.model';

class RateGuidanceConfigRepository {
  rateGuidanceConfigModel: any;
  rateGuidanceModel: any;

  constructor() {
    this.rateGuidanceConfigModel = RateGuidanceConfig;
    this.rateGuidanceModel = RateGuidance;
  }

  
async createOrUpdate(program_id: string, is_enabled: boolean) {
    const [updated] = await this.rateGuidanceConfigModel.update(
      { is_enable: is_enabled, updated_on: Date.now() },
      { where: { program_id } }
    );

    if (updated === 0) {
      return await this.rateGuidanceConfigModel.create({
        program_id,
        is_enable: is_enabled,
        created_on: Date.now(),
        updated_on: Date.now()
      });
    }

    return await this.rateGuidanceConfigModel.findOne({ where: { program_id } });
  }
async findById(id: string) {
  return await this.rateGuidanceConfigModel.findOne({
    where: { id },
    attributes: ['id', 'program_id', 'is_enable']
  });
}



}

const rateGuidanceConfigRepository = new RateGuidanceConfigRepository();
export default rateGuidanceConfigRepository;
