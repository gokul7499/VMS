export interface LanguageData {
  id?: string; // UUID
  name?: string;
  type?: string;
  locale?:string;
  created_on?: any;
  updated_on?: any;
  created_by:string;
  updated_by:string;
  is_deleted?: boolean
}