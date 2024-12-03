export interface timeSheetConfigInterface {

    id: string;
    program_id: string;
    title: string;
    display_title: string;
    is_active: boolean;
    hierarchy_ids: any;
    location_type: any;
    work_location_ids: any;
    rules: any;
    work_period: string;
    work_start_day: any
    created_by: any;
    modified_by: any;
    created_on: any;
    info_level_details: any;
    is_enabled: boolean;
    foundational_data: any;
    remote_country_ids: any;
    remote_state_ids: any;
    remote_county_ids: any;
    remote_city_ids: any;
    version: number;
    is_all_remote_work_location: boolean;
    copy_number: string;
    activity_notes: string
    modified_on: number;
    is_deleted?: boolean;
    time_sheet_format: string
    is_all_work_location: boolean;

}

