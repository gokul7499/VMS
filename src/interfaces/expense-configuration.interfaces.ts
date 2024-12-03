interface PermissionConfig {
    type: string;
    value: number;
  }
  
  interface ProjectDataConfig {
    is_master_data: boolean;
    value: string[];
  }
  
  interface ExpenseIcon {
    url: string;
    value: string;
  }
  
  interface UnitBaseConfig {
    unit_label: string;
    amount_per_unit: string;
  }
  
  interface ExpenseType {
    id: any;
    expense_type: string;
    expense_code: string;
    expense_name: string;
    expense_icon: ExpenseIcon;
    attachment_mandatory: boolean;
    notes_mandatory: boolean;
    msp_applicable: boolean;
    status: boolean;
    unit_base: boolean;
    unit_base_config: UnitBaseConfig;
  }
  
  interface ExpenseHeader {
    foundational_data: {
      value: string[];
      is_allow: boolean;
    };
  }
  
  export interface ExpenseConfigurationAttributes {
    unit_base_config: any;
    unit_base: any;
    msp_applicable: any;
    notes_mandatory: any;
    attachment_mandatory: any;
    expense_icon: any;
    expense_name: any;
    expense_code: any;
    id: string;
    config_name: string;
    status: boolean;
    hierarchy: string[];
    expense_start_date: any;
    week_end_day: string;
    is_expense: boolean;
    is_taxable: boolean;
    user_role: string[];
    expense_header: ExpenseHeader;
    is_permission: boolean;
    permission_config: Record<string, PermissionConfig>;
    is_project: boolean;
    project_config: {
      master_data: ProjectDataConfig;
      custom_data: ProjectDataConfig;
      worker_code: ProjectDataConfig;
    };
    expense_type: ExpenseType[];
    is_deleted: boolean;
    is_enabled: boolean;
    created_on: number;
    modified_on: number;
    updated_by:string;
    created_by:string;
    
  }
  