export interface UserMappingAttributes {
    id: string;
    group_id: string;
    role_id: string;
    user_id: string;
    user_type: string;
    vendor_id: string;
    program_id: string;
    is_activated: boolean;
    is_deleted: boolean;
    created_on?: number;
    updated_on?: number;
    created_by: string;
    updated_by: string;
    ref_id: string;
    tenant_id: string;
}
