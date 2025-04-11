export interface ExpenseConfigurationAttributes {
  id: string;
  program_id: string;
  name?: string;
  hierarch_ids?: any;
  expense_type_ids?: any;
  weekending_day?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  mdt_display_headers?: any;
  projects?: any;
  is_thresholds_enabled?: boolean;
  general_exp_duration_rule?: any;
  worker_access_revoke_rule?: any;
  misc_exp_entry_rules?: any;
  general_exp_entry_rules?: any;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on?: number;
  updated_on?: number;
  created_by?: string;
  updated_by?: string;
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
    id: { type: "string", format: "uuid" },
    program_id: { type: "string", format: "uuid" },
    name: { type: "string" },

    hierarch_ids: {
      type: "array",
      items: { type: "string" }
    },
    expense_type_ids: {
      type: "array",
      items: { type: "string" }
    },
    weekending_day: {
      type: "string",
      enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    mdt_display_headers: {
      type: "object"
    },
    projects: {
      type: "object"
    },
    is_thresholds_enabled: { type: "boolean" },

    general_exp_duration_rule: {
      type: "object"
    },
    worker_access_revoke_rule: {
      type: "object"
    },
    misc_exp_entry_rules: {
      type: "object"
    },
    general_exp_entry_rules: {
      type: "object"
    },
    is_enabled: { type: "boolean" },
    is_deleted: { type: "boolean" },
    created_on: { type: "number" },
    updated_on: { type: "number" },
    created_by: { type: "string", format: "uuid" },
    updated_by: { type: "string", format: "uuid" }
  },
  required: ["program_id", "is_enabled", "is_deleted"]
};


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
