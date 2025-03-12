export interface LanguageData {
  id?: string; // UUID
  name?: string;
  type?: string;
  locale?:string;
  created_on?: number;
  updated_on?: number;
  created_by:string;
  updated_by:string;
  is_deleted?: boolean
}