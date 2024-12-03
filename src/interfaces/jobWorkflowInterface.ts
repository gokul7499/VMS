export interface JobWorkFlow {
  id: string,
  name: string,
  event_id: string,
  method_id: string,
  hierarchies: any[],
  placement_order: number,
  module: string,
  config: any,
  status:string,
  is_enabled: boolean,
  levels: any[],
  initialTrigger: any[],
  created_on: Date,
  modified_on: Date,
  created_by: string,
  modified_by: string,
  program_id: string,
  is_deleted: boolean,
  workflow_id: string,
  flow_count: number,
  limit: number,
  page: number
}

export interface Recipient {
  name: string;
  level_id: string;
  user_id:string;
  avatar: string;
  role_id: string;
  // user: Users
  recipient_type: string;
  behaviour: string;
}

export interface Level {
  level_id: string;
  level_status: string;
  placement_order: number;
  recipients: Recipient[];
}

export interface Workflow {
  status:string;
  job_workflow_id:string;
  workflow_id: string;
  workflow_name: string;
  workflow_type: string;
  levels: Level[];
}

export interface Users {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  role_id: string;
}
