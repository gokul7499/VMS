//write interface file of shiftType
export interface ShiftTypeAttributes {
    program_id: string;
    shift_type_name: string;
    time_duration: string;
    shift_type_category: string;
    shift_start_time: string;
    shift_end_time: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: number;
    modified_on: number;
    created_by: string;
    modified_by: string;
    hierarchy_ids:string;
  }