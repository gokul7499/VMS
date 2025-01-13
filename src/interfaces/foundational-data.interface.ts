export interface FoundationalDataInterface {
    id: string;
    name: string;
    code: string;
    description: string;
    is_enabled: boolean;
    foundational_data_type_id: string;
    program_id: string;
    is_deleted: boolean;
    creation_source: string;
    manager_id: string;
    created_on: number;
    modified_on: number;
    created_by: string;
    modified_by: string;
    depended_fields: any,
    is_billable: boolean
}