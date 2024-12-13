import { FastifyInstance } from 'fastify';
import {
saveCustomFieldsHierarchie,
  getCustomFieldById,
  updateCustomFieldById,
  deleteCustomField,
  searchCustomFields
} from '../controllers/custom_field_hierarchie.controller';
async function customFieldsMasterDataRoutes(fastify: FastifyInstance) {
  fastify.post('/custom-fields-master-data', saveCustomFieldsHierarchie);
  fastify.get('/program/:program_id/custom-fields--master-data/:id', getCustomFieldById);
  fastify.put('/program/:program_id/custom-fields--master-data/:id', updateCustomFieldById);
  fastify.delete('/program/:program_id/custom-fields--master-data/:id', deleteCustomField);
  fastify.get('/program/:program_id/custom-fields--master-data', searchCustomFields);
}
 
export default customFieldsMasterDataRoutes;