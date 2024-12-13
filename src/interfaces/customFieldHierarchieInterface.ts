import CustomField from "../models/custom-fields.model";

export interface CustomFieldHierarchieInterface {
  id?: string;
  program_id?: string;
  customField_id?: string;
  hierarchie_id?: string;
  is_deleted: boolean;
  is_enabled: boolean;
  created_on: Date;
}
interface CustomFieldGroup {
  [hierarchy_id: string]: number[];
}

interface CustomFieldsDetails {
  [hierarchy_id: string]: CustomField[];
}