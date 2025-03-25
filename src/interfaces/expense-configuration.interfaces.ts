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
  is_enabled: boolean;
  is_deleted: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
  hierarchy?: any;
  expense_item_type_config?: any;
  master_data?: any
}
export const paramsSchema = {
  type: 'object',
  properties: {
    program_id: { type: 'string' },
    id: { type: 'string' }
  },
  required: ['program_id']
};

export const querySchema = {
  type: 'object',
  properties: {
    search: { type: 'string' },
    limit: { type: 'integer' },
    offset: { type: 'integer' }
  }
};

export const createExpenseConfigurationSchema = {
  type: "object",
  properties: {
    program_id: { type: "string" },
    id: { type: "string" },
    name: { type: "string" },
    hierarchy: {
      type: "array",
    },
    is_enabled: { type: "boolean" },
    weekending_day: {
      type: "string",
    },
    mdt_display_headers: {
      type: "object",
    },
    projects: {
      type: "object",

    },
    enable_thresholds: { type: "boolean" },
    general_exp_incurred_submission: {
      type: "object",
    },
    revoke_worker_access: {
      type: "array",
    },
    general_exp_access_rules: {
      type: "array",
      items: {
        type: "object",
      }
    },
    misc_exp_access_rules: {
      type: "object",
    }
  }
}

export const createExpenseConfigurationAdvancedFilter = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    status: { type: 'string' },
    updated_on: {
      type: 'array',
    },
    is_enabled: { type: 'boolean' },
    hierarchy: {
      type: 'array',
    }
  }
};
