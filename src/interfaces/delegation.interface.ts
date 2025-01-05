export interface DelegationInterface {
    id: string;
    program_id: string;
    delegated_to_user_id: string;
    delegated_by_user_id: string;
    delegated_to_user_mapping_id: string;
    delegated_by_user_mapping_id: string;
    start_date: Date;
    end_date: Date;
    created_by: string;
    updated_by: string
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: Date;
    updated_on?: Date;
}