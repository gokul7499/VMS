export interface PicklistItem {
  id(id: any): unknown;
  picklist_id:string | null;
  label: string;
  defined_by: string;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on: number;
  created_by: string | null;
  modified_on: number;
  modified_by: string | null;
  program_id: string;
  value?: string | null;
  disabled_program?: object | null;
  label_program?: object | null;
  meta_data?: object | null;
}

export interface picklist {
  id: string;
  picklist_id: string | null;
  name: string;
  description: string | null;
  is_enabled: boolean;
  program_id: string;
  is_deleted: boolean;
  created_on: number;
  created_by: string | null;
  modified_on: number;
  modified_by: string | null;
  defined_by: string;
  multiselect: boolean;
  slug?: string | null;
  disabled_program?: object | null;
  is_visible: boolean;
  picklist_items?: PicklistItem[];
}

export interface picklistAttributes {
  id: string;
  picklist_id: string | null;
  name: string;
  program_id: string;
  description: string | null;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on: number;
  modified_on: number;
  created_by: string | null;
  modified_by: string | null;
  defined_by: string;
  multiselect: boolean;
  slug?: string | null;
  disabled_program?: object | null;
  is_visible: boolean;
}


export interface PicklistRow {
  name: string;
  description: string;
  slug: string;
  disabled_program: string | null;
  is_visible: boolean;
  program_id: string;
  picklist_item_id: string | null;
  label: string | null;
  defined_by: string | null;
  value: string | null;
  item_program_id: string | null;
}

export default picklist;
