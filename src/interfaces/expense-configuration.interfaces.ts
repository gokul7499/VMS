export interface ExpenseConfigurationAttributes {
  id: string;
  name?: string;
  program_id: string;
  enable_thresholds?: boolean;
  weekending_day?: string;
  mdt_display_headers?: any;
  misc_exp_access_rules?: any;
  general_exp_access_rules?: any;
  revoke_worker_access?: any;
  general_exp_incurred_submission?: any;
  project?: any;
  master_data?: any;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on: number;
  modified_on: number;
  created_by?: string;
  updated_by?: string;
  hierarchy?: any; 
  expense_item_type_config?: any; 
}
