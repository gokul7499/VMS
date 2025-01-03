export interface hierarchiesData {
  id: string;
  default_timezone?:string;
  parent_hierarchy_id: string;
  program_id:string;
  name: string;
  is_enabled: boolean;  
  rate_model: string;
  created_by: string;
  created_on: number;
  modified_by: string;
  modified_on: number;
  defaults: any[];  
  code: string;
  default_date_format:string,
  default_time_format:string,
  default_currency: string,
  default_language:string,
  is_vendor_neutral_program:boolean,
  is_hide_candidate_img:boolean,
  manage_tax: any;
  manage_adjustment:any;
  custom_fields: any
}