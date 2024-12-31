export interface RateTypeInterface {
    type: any;
    id: string;
    name: string;
    is_enabled?: boolean;
    is_deleted: boolean;
    created_on?: number;
    modified_on?: number;
    created_by?: string | null;
    modified_by?: string | null;
    abbreviation?: string | null;
    shift_type?: string | null;
    is_shift_rate?: boolean | null;
    rate?:Rate;
    is_base_rate?: boolean | null;
    program_id?: string | null;
    rate_type_category?: string | null;
    differential_on?: string;
    page?: string;
    limit?: string;
    base_differential_on?: string;
    differential_type?: string;
    differential_value: number;
}
export interface CreateRateTypeData {
    type: any;
    id: string;
    name: string;
    is_enabled?: boolean;
    is_deleted: boolean;
    created_on?: number;
    modified_on?: number;
    created_by?: string | null;
    modified_by?: string | null;
    abbreviation?: string | null;
    shift_type?: string | null;
    is_shift_rate?: boolean | null;
    rate?:Rate;
    is_base_rate?: boolean | null;
    program_id?: string | null;
    rate_type_category?: string | null;
    differential_on?: string;
    page?: string;
    limit?: string;
}
interface Rate{
    differential_on?:string;
    base_differential_on?:string;
    differential_type?:string;
    differential_value:number;
}