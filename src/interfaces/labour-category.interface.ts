interface IndustriesInterface {
  id: string;
  name: string;
  ref_id: string;
  program_id: string;
  is_enabled: boolean | string;
  page?: string;
  limit?: string;
  created_by?:string;
  created_on?:any;
  updated_on?:any;
  updated_by?:string;
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

export const createIndustriesSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
    is_enabled: { type: 'boolean' },
    program_id: { type: 'string' }
  }
}

export const bulkUploadIndustriesSchema = {
  type: 'array',
  items: {
    "type": "object",
    required: ['name'],
    properties: {
      name: { type: 'string' },
      is_enabled: { type: 'boolean' },
      program_id: { type: 'string' }
    }
  }
}
export { IndustriesInterface, };
