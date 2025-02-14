export interface FoundationalDataInterface {
    id: string;
    name: string;
    code: string;
    description: string;
    is_enabled: boolean;
    foundational_data_type_id: string;
    program_id: string;
    is_deleted: boolean;
    creation_source: string;
    manager_id: string;
    created_on: number;
    modified_on: number;
    created_by: string;
    modified_by: string;
    depended_fields: any,
    is_billable: boolean
}

export const paramsSchema = {
    type: 'object',
    properties: {
        program_id: { type: 'string' },
        id: { type: 'string' }
    },
    required: ['program_id']
};
export const querySchema = {
    type: 'object',
    properties: {
        search: { type: 'string' },
        limit: { type: 'integer' },
        offset: { type: 'integer' }
    }
};
export const createFoundationalDataSchema = {
    type: 'object',
    required: ['name'],
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        is_enabled: { type: 'boolean' },
        associations: { type: 'array' },
        program_id: { type: 'string' },
        configuration: {
            type: 'object',
            properties: {
                user_association_exclude: { type: 'boolean' },
                allow_multiple_default_values: { type: 'boolean' },
                view_only: { type: 'boolean' },
                financial_master_data_type: { type: 'boolean' },
                require_owner: { type: 'boolean' },
                track_owner: { type: 'boolean' },
                timesheet_master_data: { type: 'boolean' },
                allow_multiple_jobs: { type: 'boolean' },
                allow_multiple_sows: { type: 'boolean' },
                contigent_option: { type: 'string' },
                service_option: { type: 'string' },
            },
        }
    }
}