export interface HolidayCalendarData {
  id: string;
  program_id: string;
  name: string;
  is_enabled: boolean;
  is_deleted: boolean;
  year: number;
  is_all_hierarchy_associated: boolean;
  is_all_worklocation_associated: boolean;
  hierarchy_units_ids?: string;
  work_locations_ids?: string; 
  created_on?: number; 
  created_by?: string;
  updated_on?: number;
  updated_by?: string;
}
