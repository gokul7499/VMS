import { FastifyInstance } from 'fastify';
import {
  saveCustomFields,
  getAllCustomFields,
  getCustomFieldById,
  updateCustomFieldById,
  deleteCustomField,
  searchCustomFields,
  updateCustomFieldsIsdisable,
  advanceFilterCustomFiled
} from '../controllers/custom-fields.controller';
import { createCustomFieldsSchema, paramsSchema } from '../interfaces/custom-fields.interface';

async function customFieldsRoutes(fastify: FastifyInstance) {
  fastify.post('/custom-fields',{
    schema: {
      body:createCustomFieldsSchema,
    }
  },
     saveCustomFields);
  fastify.get('/program/:program_id/custom-fields',
    {
      schema:{
       
         params: paramsSchema,
      }
    }, getAllCustomFields);
  fastify.get('/program/:program_id/custom-fields/:id',{
    schema:{
       params: paramsSchema,
    }
  }, getCustomFieldById);
  fastify.put('/program/:program_id/custom-fields/:id',{
    schema:{
      body:createCustomFieldsSchema,
      params: paramsSchema,

    }
  }, updateCustomFieldById);
  fastify.delete('/program/:program_id/custom-fields/:id',
    {
      schema:{
        params:paramsSchema
      }
    },
     deleteCustomField);
  fastify.get('/program/:program_id/custom-fields/search', searchCustomFields);
  fastify.put('/program/:program_id/custom-fields/:id/enable-disable', updateCustomFieldsIsdisable);
  fastify.post('/program/:program_id/custom-fields/advance-filter', advanceFilterCustomFiled); 
}

export default customFieldsRoutes;