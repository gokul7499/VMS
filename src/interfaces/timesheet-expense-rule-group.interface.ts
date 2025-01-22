export interface TimesheetExpenseRuleGroupData {
    id: string;
    program_id: string;
    rule_group_name: string;
    rule_type: string;
    rule_category:string;
    timesheet_expense_rules:any;
    is_enabled: boolean;
    is_deleted?: boolean;
    created_on: number;
    modified_on: number;
    created_by: string;
    modified_by: string;
}
