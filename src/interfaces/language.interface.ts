export interface LanguageData {
  id?: string; // UUID
  name?: string;
  type?: string;
  locale?:string;
  created_on?: number;
  modified_on?: number;
  is_deleted?: boolean
}