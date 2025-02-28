interface qualificationType {
  id: string;
  name: string;
  code: string;
  description: Text;
  is_enabled: boolean;
  is_deleted:boolean;
  created_on:any;
  updated_on:any;
  created_by:string | null;
  updated_by:string |null;
  program_id: string;
  page?: string;
  limit?: string;
  type?:string
}

export default qualificationType;