export interface RateTypeJobTemplateData {
  id?: string;
  program_id?:string;
  job_template_id?:string;
  rate_type_id?:string;
  is_enabled?: boolean;
  created_on?: number; 
  modified_on?: number;
  created_by?: string; 
  modified_by?: string; 
  is_deleted?: boolean;
  is_excluded?:boolean;
}