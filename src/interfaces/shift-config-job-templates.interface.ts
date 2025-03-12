export interface ShiftConfigurationJobTemplate {
    id: string;
    shift_config_id: string;
    job_template_id: string;
    program_id: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: number;
    updated_on: number;
    created_by?: string;
    updated_by?: string;
  
  }