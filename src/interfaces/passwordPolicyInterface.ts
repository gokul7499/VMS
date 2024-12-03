export interface passwordPolicyData {
    id: string;
    expire_in: number;
    retained: number;
    must_contain: any;
    cannot_contain: any;
    not_allowed_words: any;
    min_length: number;
    max_log_attempt: number;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: number;
    modified_on: number;
    created_by: string;
    modified_by: string;
    mfa_data: any;
    program_id: string;
}