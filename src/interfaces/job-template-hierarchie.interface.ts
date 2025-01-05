export interface JobTemplateHierarchyInterface {
    id: string;
    job_temp_id?: string | null;
    hierarchy: any;
    is_deleted: boolean;
    is_enabled: boolean;
    created_on: number;
    modified_on: number;
    program_id: string;
}