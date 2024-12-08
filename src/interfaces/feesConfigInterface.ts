import { Json } from "sequelize/types/utils";

export interface FeesConfigurationInterface {
  title: string;
  program_id: string
  hierarchy_levels: Json;
  source_model: Json;
  labor_category: Json;
  vendors: Json;
  effective_date?: string;
  funding_model: string;
  ref_id?: string;
  categorical_fees: Json;
  is_enabled: boolean,
  is_deleted: boolean
}
