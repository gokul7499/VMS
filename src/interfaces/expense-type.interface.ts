export interface ExpenseTypeInterface {
    id: string;
    name?: string;
    category?: string;
    type?: string;
    code?: string;
    is_enabled: boolean;
    is_mandatory_attachment: boolean;
    is_optional_attachment: boolean;
    is_manadatory_notes: boolean;
    is_optional_notes: boolean;
    apply_msp_fee: boolean;
    appply_tax?: boolean;
    allow_negative_expense?: boolean;
    allow_unit_based?: boolean;
    unit_based?: any;
    expense_icon?: any;
    program_id: string;
    created_on: any;
    modified_on: any;
    created_by?: any;
    modified_by?: any;
    ref_id?: string;
    is_deleted: boolean;
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

export const createExpenseTypeSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        category: { type: 'string' },
        code: { type: 'string' },
        is_enabled: { type: 'boolean' },
        unit_based: {
            type: 'object',
            properties: {
                unitType: { type: 'string' },
                rate: { type: 'string' },
                max_limit: { type: 'string' }
            }
        },
        is_mandatory_attachment: { type: 'boolean' },
        is_manadatory_notes: { type: 'boolean' },
        apply_msp_fee: { type: 'boolean' },
        allow_unit_based: { type: 'boolean' },
        allow_negative_expense: { type: 'boolean' },
        appply_tax: { type: 'boolean' }
    }
};
