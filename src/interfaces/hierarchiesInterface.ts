export interface hierarchiesData {
  timezone_id: any;
  is_default_timezone?:string;
  id: string;
  parent_hierarchy_id: string;
  program_id:string;
  name: string;
  is_enabled: boolean; 
  preferred_date_format: string;
  is_rate_card_enforced: boolean;
  rate_model: string;
  created_by: string;
  created_on: number;
  modified_by: string;
  modified_on: number;
  defaults: any[];
  is_hidden: boolean;
  code: string;
  foundational_data:any,
  is_enable_adjustment:boolean,
  is_enable_tax:boolean
}