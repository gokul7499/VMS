export interface holidayCalendarData {
    id: string;
    name: string;
    is_enabled: boolean;
    year: number;
    is_all_hierarchies: boolean;
    hierarchy_units_ids: any;
    is_all_work_locations: boolean;
    work_locations_ids: any;
    holidays: any;
    is_deleted: boolean;
    created_on: number;
    updated_on: number;
    created_by: string;
    updated_by: string;
    program_id: string;
}