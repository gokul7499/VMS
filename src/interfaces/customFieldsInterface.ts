export interface customFields {
  hierarchy_ids: never[];
  id: string;
  program_id: string;
  type: string;
  name: string;
  label: string;
  slug: string;
  placeholder: string;
  meta_data: object;
  is_all_work_location: boolean;
  is_all_hierarchy: boolean;
  supporting_text: string;
  description: string | null;
  is_required: boolean;
  is_readonly: boolean;
  is_enabled: boolean;
  modified_on: Date;
  created_by: string;
  can_view: JSON;
  can_edit: JSON;
  job_type: JSON;
  is_linked: boolean;
  work_location_ids?: string[];

  linked_module: JSON;
}



export interface getQueryInterface {
  limit: string;
  page?: string; 
      is_enabled?: string;
      name?: string;
      module_name?: string;
      label?: string;
      field_type?: string;
      is_required?: string;
      modified_on?: string;
      slug?: string;
      program_id?: string;
}