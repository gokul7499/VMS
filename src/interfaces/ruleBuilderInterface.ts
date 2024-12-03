import { Json } from "sequelize/types/utils";

interface ReferenceData {
  table: string;
  column: string;
  id: string;
}

export interface Condition {
  field_name: string;
  operator: string;
  values: string | number;
  reference?: ReferenceData;
}

export interface Action {
  field: string;
  reference?: ReferenceData;
}
// export interface Conditions{
//   field_name?:string,
//   operator?:string,
//   values?:string[]
// }

export enum RuleStatus {
  Active = "Active",
  Inactive = "Inactive",
  Expired = "Expired"
}

// export interface Actions{
//   field?:string,
//   values?:string[]
// }
export interface ruleBuilderAttributes {
  id?: string;
  rule_code?: string;
  rule_name?: string;
  module_id?: string;
  program_id?: string;
  module_name?: string;
  module_code?: string;
  rule_type?: string;
  effective_start_date?: string;
  effective_end_date?: string;
  created_on?: string;
  created_by?: string;
  updated_by?: string;
  is_enabled?: boolean;
  modified_by?: string;
  modified_on?: string;
  rule_event_id?: string;
  is_deleted?: boolean;
  page?: number;
  limit?: number;
  hierarchies?:string[];
  placement_order?:number;
  decision_table_rule_files?:object;
  conditions?:Condition[];
  actions?:Action[];
  initial_trigger_conditions?:object;
  rule_inputs?:object;
  rule_outputs?:object;
  rules_json?:object;
  file_submission_status?:string;
  rule_initial_trigger_conditions?:object;
  enable_dates?:number;
  status?:RuleStatus;
  created_at?:Date
}
