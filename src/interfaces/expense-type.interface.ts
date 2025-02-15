export interface ExpenseTypeInterface {
    id: string;
    name?: string;
    category?: string;
    code?: string;
    is_enabled: boolean;
    is_attachment_mandatory: boolean;
    is_notes_mandatory: boolean;
    apply_msp_fee: boolean;
    apply_tax: boolean;
    allow_negative_expense: boolean;
    unit_based: boolean;
    unit_label?: string;
    rate_per_unit?: number;
    max_unit_limit?: number;
    program_id: string;
    created_on: number;
    modified_on: number;
    created_by?: string;
    modified_by?: string;
    is_deleted: boolean;
}
