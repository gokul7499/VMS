export interface VendorDistributionSchedule {
    name: string;
    description: string;
    is_enabled: boolean;
    is_deleted:boolean;
    created_by: string;
    updated_by: string;
    created_on?: bigint;
    updated_on?: bigint;
    schedules: {
        condition: any;
        duration: number;
        measure_unit: string;
        vendors: string[];
    }[];
}
export interface updateVendorDistributionScheduleDetail {
    name?: string;
            description?: string;
            is_enabled?: boolean;
            schedules?: {
                id: any;
                duration?: number;
                measure_unit?: string;
                vendors?: any;
            }[];
}