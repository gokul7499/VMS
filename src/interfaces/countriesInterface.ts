export default interface Countries {
    id: string;
    name: string;
    iso_code_2: string;
    iso_code_3: string;
    isd_code: string;
    min_phone_length: number;
    max_phone_length: number;
}

export interface GetCountries { }
export interface CountriesOutput { }