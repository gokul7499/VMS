export interface ShiftConfigurationJobTemplate {
    id: string;
    shift_config_id: string;
    job_template_id: string;
    program_id: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: Date;
    modified_on: Date;
    created_by?: string;
    modified_by?: string;
  
  }