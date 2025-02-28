
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
  updated_on: number;
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
  type: 'object',
  required: ['config_name'],
  properties: {
    config_name: { type: 'string' },
    is_enabled: { type: 'boolean' },
    hierarchy: {
      type: 'array',
    },
    week_end_day: { type: 'string' },
    master_data: {
      type: 'object',
      properties: {
        is_enabled: { type: 'boolean' },
        value: {
          type: 'array',
        }
      }
    },
    project: {
      type: 'object',
      properties: {
        is_enabled: { type: 'boolean' },
        value: {
          type: 'array',
        }
      }
    },
    thresholds: {
      type: 'object',
      properties: {
        is_enable: { type: 'boolean' },
        genaral_expense_sub: {
          type: 'object',
          required: ['type', 'value'],
          properties: {
            type: { type: 'string' },
            value: { type: 'string' }
          }
        },
        remove_msp_access_general: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            value: { type: 'string' }
          }
        },
        remove_user_access_misc: {
          type: 'object',
          properties: {
            msp: {
              type: 'object',
              properties: {
                unit: { type: 'string' },
                value: { type: ['string', 'null'] }
              }
            },
            vendor: {
              type: 'object',
              properties: {
                unit: { type: 'string' },
                value: { type: ['string', 'null'] }
              }
            }
          }
        },
        revoke_user_access: {
          type: 'object',
          properties: {
            msp: {
              type: 'object',
              properties: {
                unit: { type: 'string' },
                value: { type: ['string', 'null'] }
              }
            },
            vendor: {
              type: 'object',
              properties: {
                unit: { type: 'string' },
                value: { type: ['string', 'null'] }
              }
            }
          }
        }
      }
    }
  }
};


export const createExpenseConfigurationAdvancedFilter = {
  type: 'object',
  properties: {
    config_name: { type: 'string' },
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
