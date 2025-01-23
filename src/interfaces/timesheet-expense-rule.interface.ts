export interface TimesheetExpenseRule{
    id?: string; 
    rule_name?: string;
    rule_type?: string;
    rule_duration?: string;
    break_type?: string;
    is_paid_break?: boolean;
    is_break_mandatory?: boolean;
    weekend_days?: any; 
    conditions?: any; 
    penalty_rules?:{
        method:string;
        apply_rate_type:string;
        no_missing_breaks:number;
        penalty_rat_hours:number;
    }
    apply_rate_type?: any;
    created_by?: string;
    modified_by?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    created_on?: number;
    modified_on?: number;
    program_id: string; 
}