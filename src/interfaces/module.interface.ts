interface ModuleData {
    name: string,
    parent_module_id: string,
    description: string,
    is_enabled: boolean,
    is_deleted: boolean,
    created_on: number,
    modified_on: number,
    created_by: string,
    modified_by: string,
    is_custom_field: boolean
  }
  export default ModuleData;
  