import { Json } from "sequelize/types/utils";

export interface Address {
  type: string;
  street_1: string;
  street_2?: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
}

export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  designation?: string;
}

export interface PasswordPolicy {
  min_length: number;
  max_log_attempt: number;
  expire_in: number;
  retained: number;
  must_contain: string[];
  cannot_contain: string[];
  mfa: {
    is_enabled: boolean;
    skip_duration_in_days?: number;
  };
}

export interface TenantData {
  id?: string; // UUID
  tenant_parent_id?: string; // UUID
  name?: string;
  type?: string;
  display_name?: string;
  logo?: string;
  addresses?: Address[]; // Array of Address objects
  contacts?: any; // Replace 'any' with a more specific type if known
  password_policy?: PasswordPolicy;
  primary_contact?: Contact;
  secondary_contact?: Contact;
  is_enabled?: boolean;
  created_on?: number; // Unix timestamp
  modified_on?: number; // Unix timestamp
  created_by?: string; // UUID
  modified_by?: string; // UUID
  is_deleted?: boolean;
  ref_id?: string; // UUID
  vendor_industry?: any;
}




