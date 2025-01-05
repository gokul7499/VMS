interface JobTemplateDistSchedule {
  id: string;
  job_temp_id?: string | null;
  dist_shedule_id?: string | null;
  schedule_value: number;
  schedule_unit: string;
  vendors: any;
  is_enabled: boolean;
  is_deleted: boolean;
  created_on?: number;
  modified_on?: number;
  created_by?: string | null;
  modified_by?: string | null;
  program_id: string;
}

export default JobTemplateDistSchedule;