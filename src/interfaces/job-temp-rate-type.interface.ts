export interface JobTempRateTypeInterface {
    id: string;
    program_id: string;
    job_temp_id: string;
    bill_rate: any;
    pay_rate: any;
    rate_factor_id?: string | null;
    abbreviation: string;
    billable: boolean;
    name: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_by?: string | null;
    modified_by?: string | null;
    created_on?: number | null;
    modified_on?: number | null;
}
