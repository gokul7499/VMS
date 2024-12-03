import { RuleStatus } from "./ruleBuilderInterface";

export interface RuleBuilderDecisionTableData {
  id?: string;
  program_id?: string;
  hierarchy_ids?: string[];
  rule_id?: string;
  rule_name?: string;
  is_enabled?: boolean;
  created_on?: number;
  modified_on?: number;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;
  event_slug?: string;
  rules_json?: any;
  status?: RuleStatus;
  module_id?: string;
  rule_event_id: string,
  payload: any;
}