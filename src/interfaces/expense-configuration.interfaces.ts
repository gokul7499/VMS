
export interface ExpenseConfigurationAttributes {
  id: string;
  config_name?: string;
  status?: boolean;
  program_id: string;
  week_end_day?: string;
  thresholds?: any;
  remove_msp_access_general?: any;
  remove_user_access_misc?: any;
  revoke_user_access?: any;
  project?: any;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on: number;
  modified_on: number; 
  created_by?: string;
  updated_by?: string;
  hierarchy?: any; 
  expense_item_type_config?: any; 
  master_data?:any
}
  