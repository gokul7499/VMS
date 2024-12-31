export interface RateConfigurationsInterface {
    id: string;
    name: string;
    is_shift_rate: boolean;
    program_id?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    page?: string;
    limit?: string;
    created_by: string;
    modified_by: string;
    created_on: number;
    modified_on: number;
    hierarchies:any;
    job_templates:any;
    rate_configuration:any;
}