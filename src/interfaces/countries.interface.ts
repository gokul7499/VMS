export default interface Countries {
    id: string;
    name: string;
    iso_code_2: string;
    iso_code_3: string;
    isd_code: string;
    min_phone_length: number;
    max_phone_length: number;
    created_on:any;
    updated_on:any;
    created_by:string;
    updated_by:string;
}

export interface GetCountries { }
export interface CountriesOutput { }