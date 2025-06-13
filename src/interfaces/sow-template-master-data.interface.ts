export interface SOWTemplateMasterDataInterface {
  id?: string;
  program_id?: string;
  sow_temp_id?: string;
  sow_data_id?: string;
  sow_foundation_data_type_id?:JSON;
  sow_foundation_data_id?:JSON;
  is_deleted: boolean;
  is_enabled: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by:string;
  updated_by:string;
}
