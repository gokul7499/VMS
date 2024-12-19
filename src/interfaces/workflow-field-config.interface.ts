export interface WorkflowFieldConfigAttributes {
  id?: string;               
  name: string;              
  slug: string;              
  config?: object;           
  placement_order?: number;  
  nest_level?: number;       
  field_id?: string;        
  parent_config_id?: string; 
  schema?: string;           
  is_enabled?: boolean;     
  created_on?: number;       
  modified_on?: number;     
  created_by?: string;       
  modified_by?: string;      
  is_deleted?: boolean; 
}

