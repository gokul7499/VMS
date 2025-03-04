export interface SowTemplate {
    master_date_type: any;
    id: string;
    program_id: string;
    type: string;
    template_title: string;
    description: string;
    is_sow_assinment: boolean; 
    is_sow_expense: boolean;
    is_sow_milestones: boolean;
    is_sow_payment_req: boolean;
    is_sow_schedule_payments: boolean;
    is_sow_desc_mandatory: boolean;
    upload_description: {
        is_enable: boolean;
        is_upload_desc_mandatory: boolean;
    };
    is_update_sow_desc: boolean;
    is_req_doc_mandatory: boolean;
    is_deleted: boolean;
    created_on: string; 
    updated_on: string; 
    created_by: string;
    updated_by: string;
    hierarchy:any;
    custom_fields:any;
    master_data:any;
}
