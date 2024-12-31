export interface ExpenseTypeInterface {
    id: string;
    name?: string;
    category?: string;
    type?: string;
    code?: string ;
    is_enabled: boolean;
    is_mandatory_attachment: boolean;
    is_optional_attachment: boolean;
    is_manadatory_notes: boolean;
    is_optional_notes: boolean;
    apply_msp_fee: boolean;
    appply_tax?:boolean;
    allow_negative_expense?:boolean;
    allow_unit_based?: boolean;
    unit_based?: any;
    expense_icon?: any;
    program_id: string;
    created_on: any;
    modified_on: any;
    created_by?: any;
    modified_by?: any;
    ref_id?: string ;
    is_deleted: boolean;
}
