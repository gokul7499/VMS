export interface CreateProgramData {
  id: string;
  name: string;
  unique_id: string;
  description?: string;
  type: string;
  industries?: string[];
  config: any;
  client_id: string;
  msp_id: string;
  start_date: string;
  is_enabled?: boolean;
  ref_id?: string;
  decoration?: any;
  module_groups?: any;
  themes?: any;
}

export interface ProgramQuery {
    search?: string;
    page_number?: string;
    page_size?: string;
    program_name?: string;
    status?: string;
    effective_date?: string;
    sort?: number;
    name?: string;
    is_activated?: string;
    start_date: string;
    sort_order?: string;
    page?: string;
    limit?: string;
    sort_field?: string
}