import { FastifyInstance } from 'fastify';
import * as CustomFieldController from '../controllers/custom-fields.controller';
import { createCustomFieldsSchema, paramsSchema } from '../interfaces/custom-fields.interface';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";

async function customFieldsRoutes(fastify: FastifyInstance) {

  fastify.post('/custom-fields', {
    schema: {
      body: createCustomFieldsSchema,
    },
    preHandler: validatePermissions(Actions.CREATE, [Permissions.CUSTOM_FIELD])
  }, CustomFieldController.saveCustomFields);

  fastify.get('/program/:program_id/custom-fields',
    {
      schema: {
        params: paramsSchema,
      },
      preHandler: validatePermissions(Actions.READ, [Permissions.CUSTOM_FIELD])
    }, CustomFieldController.getAllCustomFields);

  fastify.get('/program/:program_id/custom-fields/:id', {
    schema: {
      params: paramsSchema,
    },
    preHandler: validatePermissions(Actions.READ, [Permissions.CUSTOM_FIELD])
  }, CustomFieldController.getCustomFieldById);

  fastify.put('/program/:program_id/custom-fields/:id', {
    schema: {
      body: createCustomFieldsSchema,
      params: paramsSchema
    },
    preHandler: validatePermissions(Actions.UPDATE, [Permissions.CUSTOM_FIELD])
  }, CustomFieldController.updateCustomFieldById);

  fastify.delete('/program/:program_id/custom-fields/:id',
    {
      schema: {
        params: paramsSchema
      },
      preHandler: validatePermissions(Actions.DELETE, [Permissions.CUSTOM_FIELD])
    }, CustomFieldController.deleteCustomField);

  fastify.get('/program/:program_id/custom-fields/search', {
    preHandler: validatePermissions(Actions.READ, [Permissions.INVOICE_CONFIGURATION])
  }, CustomFieldController.searchCustomFields);

  fastify.put('/program/:program_id/custom-fields/:id/enable-disable', {
    preHandler: validatePermissions(Actions.UPDATE, [Permissions.INVOICE_CONFIGURATION])
  }, CustomFieldController.updateCustomFieldsIsdisable);

}

export default customFieldsRoutes;