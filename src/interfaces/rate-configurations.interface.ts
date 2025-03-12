export interface RateConfigurationsInterface {
    id: string;
    name: string;
    is_shift_rate: boolean;
    program_id?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    page?: string;
    limit?: string;
    created_by: string;
    updated_by: string;
    created_on: number;
    updated_on: number;
    hierarchies: any;
    job_templates: any;
    rate_configuration: any;
    job_type?: any;
    expenses:any;
}
export interface RateConfigurationsBudget {
    program_id: string;
    name: string;
    is_shift_rate: boolean;
    hierarchies: Array<{
        id: string;
        name: string;
    }>;
    job_templates: Array<{
        id: string;
        name: string;
    }>;
    rate_configuration: Array<{
        base_rate: {
            rate_type: {
                id: string;
                name: string;
                abbreviation: string;
                rate_type_category: {
                    id: string;
                    value: string;
                    label: string;
                };
                is_base_rate: boolean;
                min_rate: number;
                max_rate: number;
            };
            rates: Array<{
                rate_type: {
                    id: string;
                    name: string;
                    abbreviation: string;
                    rate_type_category: {
                        id: string;
                        value: string;
                        label: string;
                    };
                    is_base_rate: boolean;
                };
                bill_rate: Array<{
                    differential_on: string;
                    differential_type: string;
                    differential_value: number;
                    min_rate: number;
                    max_rate: number;
                }>;
                pay_rate: Array<{
                    differential_on: string;
                    differential_type: string;
                    differential_value: number;
                    min_rate: number;
                    max_rate: number;
                }>;
            }>;
        };
        rate: Array<{
            rate_type: {
                id: string;
                name: string;
                abbreviation: string;
                rate_type_category: {
                    id: string;
                    value: string;
                    label: string;
                };
                is_base_rate: boolean;
            };
            bill_rate: Array<{
                differential_on: string;
                differential_type: string;
                differential_value: number;
                min_rate: number;
                max_rate: number;
            }>;
            pay_rate: Array<{
                differential_on: string;
                differential_type: string;
                differential_value: number;
                min_rate: number;
                max_rate: number;
            }>;
            rates: any[];
        }>;
    }>;
}