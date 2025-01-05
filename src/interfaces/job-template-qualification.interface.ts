export interface JobTemplateQualificationInterface {
    id: string;
    job_temp_id?: string | null;
    qualification_type_id?: string | null;
    program_id: string;
    is_required: boolean;
    name: string;
    code?: string | null;
    qualifications: any;
    is_deleted: boolean;
    is_enabled: boolean;
    created_on: number;
    modified_on: number;
    created_by: string;
    modified_by: string;
}