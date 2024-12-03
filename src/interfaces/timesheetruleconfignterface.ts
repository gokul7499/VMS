export interface TimesheetRuleData {
    id: string;
    title?: string;
    status?: boolean;
    program_id?: string;
    rules_config: JSON;
    is_active: boolean;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: Date;
    hierarchy_ids: JSON;
    timesheet_config_id: string;
    modified_on: any;
    created_by: string;
    modified_by: string;
    ref_id?: string;
}

