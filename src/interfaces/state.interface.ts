
export interface stateInterface {
    id: string;
    name?: string;
    code?: string;
    created_by?: any;
    updated_by?: any;
    ref_id?: string;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: number;
    updated_on: number;
    program_id: string;
    country_id: string;
    programs?: string;
}

 export interface StatePayload {
    country_id: string;
    states: string[];
}