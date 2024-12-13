import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFields, GetQueryInterface } from '../interfaces/customFieldsInterface';
import WorkLocationModel from '../models/workLocationModel';
import hierarchies from '../models/hierarchiesModel';
import generateCustomUUID from '../utility/genrateTraceId';
import customFieldsHierarchie from '../models/custom-field-hierarchie.model';
import customFieldMasterData from '../models/custom-field-master-data.model';
import customFieldLocations from '../models/customFieldLocationModel';
import CustomField from '../models/customFieldsModel'
import { saveCustomFieldsMasterData } from './custom-field-master-data.controller';
import { createCustomFieldLocations } from './customFieldLocationController';
import { saveCustomFieldsHierarchies } from './custom-field-hierarchie.controller';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op } from 'sequelize';

export const saveCustomFields = async (request: FastifyRequest<{}>, reply: FastifyReply) => {
  const { program_id, work_location_ids, hierarchy_ids, master_data_id, modules, label, name, ...customFieldData } = request.body as any;
  const trace_id = generateCustomUUID();

  // Validate Program ID
  if (!validateProgramId(program_id, reply, trace_id)) return;

  // Generate slug if name is present
  generateSlugIfNeeded(name, customFieldData);

  // Validate label length
  if (!validateLabelLength(label, reply, trace_id)) return;

  // Validate name length
  if (!validateNameLength(name, reply, trace_id)) return;

  // Validate Authorization Header
  const user = await validateAuthHeader(request, reply);
  if (!user) return;

  // Log creating customField
  logCreatingCustomField(trace_id, user, request, program_id);

  try {
    const customField = await createCustomField({ program_id, label, name, ...customFieldData });
    if (!customField?.id) {
      throw new Error('Failed to create custom field');
    }

    const custom_field_id = customField.id;

    await Promise.all([
      ...(work_location_ids?.map((work_location_id: string) => createCustomFieldLocations(custom_field_id, work_location_id, program_id)) || []),
      ...(hierarchy_ids?.map((hierarchy_id: string) => saveCustomFieldsHierarchies(custom_field_id, hierarchy_id, program_id)) || []),
      ...(master_data_id?.map((master_data_id: string) => saveCustomFieldsMasterData(master_data_id, custom_field_id)) || []),
    ]);

    logSuccess(trace_id, user, request, program_id);
    return reply.status(201).send({
      status_code: 201,
      message: 'Custom field created successfully.',
      trace_id,
    });

  } catch (error) {
    console.error('Error processing custom field:', error);
    logError(trace_id, user, request, program_id);
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id,
    });
  }
};

// Helper functions
const validateProgramId = (program_id: string | undefined, reply: FastifyReply, trace_id: string) => {
  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required.',
      trace_id: generateCustomUUID(),
    });
    return false;
  }
  return true;
};

const generateSlugIfNeeded = (name: string | undefined, customFieldData: any) => {
  if (name !== undefined) {
    customFieldData.slug = name.trim().split(' ').length > 1
      ? name.toLowerCase().split(' ').join('-')
      : name.toLowerCase();
  }
};

const validateLabelLength = (label: string | undefined, reply: FastifyReply, trace_id: string) => {
  if (label && label.length > 64) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid label, Maximum 64 characters.',
      trace_id: generateCustomUUID(),
    });
    return false;
  }
  return true;
};

const validateNameLength = (name: string | undefined, reply: FastifyReply, trace_id: string) => {
  if (name && name.length < 3) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid name, Minimum 3 characters.',
      trace_id: generateCustomUUID(),
    });
    return false;
  }
  return true;
};

const validateAuthHeader = async (request: FastifyRequest<{}>, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!(authHeader?.startsWith('Bearer '))) {
    reply.status(401).send({ message: 'Unauthorized - Token not found' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    return null;
  }
  return user;
};

const logCreatingCustomField = (trace_id: string, user: any, request: FastifyRequest<{}>, program_id: string) => {
  logger({
    trace_id,
    actor: {
      user_name: user?.preferred_username,
      user_id: user?.sub,
    },
    data: request.body,
    eventname: "creating customField",
    status: "success",
    description: `Creating customField for ${program_id}`,
    level: 'info',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, CustomField);
};

const logSuccess = (trace_id: string, user: any, request: FastifyRequest<{}>, program_id: string) => {
  logger({
    trace_id,
    actor: {
      user_name: user?.preferred_username,
      user_id: user?.sub,
    },
    data: request.body,
    eventname: "create customField",
    status: "success",
    description: `create customField for ${program_id} successfully`,
    level: 'success',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, CustomField);
};

const logError = (trace_id: string, user: any, request: FastifyRequest<{}>, program_id: string) => {
  logger({
    trace_id,
    actor: {
      user_name: user?.preferred_username,
      user_id: user?.sub,
    },
    data: request.body,
    eventname: "create customField",
    status: "error",
    description: `error to create customField for ${program_id}`,
    level: 'error',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, CustomField);
};

export const createCustomField = async (data: any) => {
  try {
    console.log("Data to be inserted:", data);
    const customFieldData = await CustomField.create(data);
    console.log("Inserted customFieldData:", customFieldData);
    return customFieldData;
  } catch (error) {
    console.error('Error during custom field creation:', error);
    throw error;
  }
};

export async function getAllCustomFields(
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: GetQueryInterface
  }>,
  reply: FastifyReply
) {
  const programId = request.params.program_id;
  const page = parseInt(request.query.page ?? '1', 10);
  const limit = parseInt(request.query.limit ?? '10', 10);

  const whereClause: any = {
    program_id: programId,
    is_deleted: false,
  };

  if (request.query.is_enabled) {
    const isEnabledValue = request.query.is_enabled === 'true' ? 1 : 0;
    whereClause.is_enabled = { [Op.eq]: isEnabledValue };
  }
  if (request.query.slug) {

    whereClause.slug = { [Op.like]: `%${request.query.slug}%` };
  }
  if (request.query.name) {
    whereClause.name = { [Op.like]: `%${request.query.name}%` };
  }
  if (request.query.module_name) {
    whereClause.module_name = { [Op.like]: `%${request.query.module_name}%` };
  }
  if (request.query.label) {
    whereClause.label = { [Op.like]: `%${request.query.label}%` };
  }
  if (request.query.field_type) {
    whereClause.field_type = { [Op.like]: `%${request.query.field_type}%` };
  }
  if (request.query.is_required) {
    const isRequiredValue = request.query.is_required === 'true' ? 1 : 0;
    whereClause.is_required = { [Op.eq]: isRequiredValue };
  }
  if (request.query.modified_on) {
    const modifiedOnPattern = `${request.query.modified_on}`;
    whereClause.modified_on = { [Op.like]: modifiedOnPattern };
  }

  try {
    const result = await CustomField.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "is_enabled",
        "modified_on",
        "module_id",
        "module_name",
        "field_type",
        "is_required",
        "label",
        "meta_data"
      ],
      order: [["modified_on", "DESC"]], // Sort by modified_on in descending order
      offset: (page - 1) * limit,
      limit: limit,
    });

    return reply.status(200).send({
      status_code: 200,
      custom_fields: result.rows,
      total_records: result.count,
      page: page,
      limit: limit,
      message: 'Custom Fields Get Successfully',
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching custom fields',
      error: error,
      trace_id: generateCustomUUID(),
    });
  }
}

export const getCustomFieldById = async (request: FastifyRequest<{ Params: { id: string; program_id: string } }>, reply: FastifyReply) => {
  const { id, program_id } = request.params;

  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: generateCustomUUID(),
    });
    return;
  }

  try {
    const customfiedData = await CustomField.findOne({
      where: { id, program_id },
      attributes: [
        "id", "name", "is_enabled", "modified_on", "can_view", "can_edit",
        "is_all_hierarchy", "is_all_work_location", "label", "placeholder",
        "field_type", "is_required", "module_id", "module_name",
        "supporting_text", "description", "is_readonly", "is_required",
        "is_linked", "is_deleted", "created_on", "modified_on",
        "supporting_text", "linked_modules", "meta_data", "job_type"
      ],
    });

    if (customfiedData) {
      const customFieldId = customfiedData.id;

      // Fetch work locations only if is_all_work_location is false, otherwise set it to an empty array
      let workLocations: WorkLocationModel[] = [];
      if (!customfiedData.is_all_work_location) {
        const locationRecords = await customFieldLocations.findAll({
          where: { custom_field_id: customFieldId },
          attributes: ["work_location_id"],
        });

        const locationIds = locationRecords.map((record) => record.work_location_id);

        workLocations = await WorkLocationModel.findAll({
          where: { id: locationIds },
          attributes: ["id", "name"],
        });
      }

      let hierarchie: hierarchies[] = [];
      if (!customfiedData.is_all_hierarchy) {
        const hierarchyRecords = await customFieldsHierarchie.findAll({
          where: { custom_field_id: customFieldId },
          attributes: ["hierarchy_id"],
        });

        const hierarchyIds = hierarchyRecords.map((record) => record.hierarchy_id);

        hierarchie = await hierarchies.findAll({
          where: { id: hierarchyIds },
          attributes: ["id", "name"],
        });
      }

      reply.status(200).send({
        status_code: 200,
        customField: {
          ...customfiedData.toJSON(),
          hierarchies: hierarchie,
          workLocations: workLocations,
        },
        message: 'Custom Fields Type Get Successfully',
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Custom Fields Type Not Found',
        trace_id: generateCustomUUID(),
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: generateCustomUUID(),
      error: (error as Error).message,
    });
  }
};

export const updateCustomFieldById = async (
  request: FastifyRequest<{ Params: { id: string; program_id: string }; Body: CustomFields }>,
  reply: FastifyReply
) => {
  const { id, program_id } = request.params;
  const updates = request.body;
  const { hierarchy_ids, work_location_ids, linked_modules, master_data_ids } = updates as {
    hierarchy_ids?: string[];
    work_location_ids?: string[];
    linked_modules?: Array<{ is_linked: boolean }>;
    master_data_ids?: string[];
  };

  // Validate program_id
  if (!program_id) {
    return sendError(reply, 400, 'Program ID is required');
  }

  try {
    const customFieldRecord = await findCustomField(id, program_id);
    if (!customFieldRecord) {
      return sendError(reply, 404, 'Custom Field not found');
    }

    const changes = await detectChanges(updates, customFieldRecord);
    if (changes) {
      await CustomField.update(updates, { where: { id, program_id } });
    }

    await processHierarchyIds(hierarchy_ids, id);
    await processWorkLocationIds(work_location_ids, id);
    await processMasterDataIds(master_data_ids, id);
    await processLinkedModules(linked_modules, id, program_id);

    return reply.status(200).send({
      status_code: 200,
      message: "Custom field updated successfully.",
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    console.error("Error updating custom field:", error);
    return sendError(reply, 500, 'Internal Server Error: Failed to update Custom Fields');
  }
};

// Helper functions
const sendError = (reply: FastifyReply, statusCode: number, message: string) => {
  reply.status(statusCode).send({
    status_code: statusCode,
    message,
    trace_id: generateCustomUUID(),
  });
};

const findCustomField = async (id: string, program_id: string) => {
  return await CustomField.findOne({ where: { id, program_id } });
};

const detectChanges = async (updates: any, customFieldRecord: any) => {
  const recordData = customFieldRecord.get();
  const otherFieldsUpdates = { ...updates };
  delete otherFieldsUpdates.work_location_ids;

  return Object.keys(otherFieldsUpdates).some((key) => {
    const k = key as keyof CustomFields;
    if (Array.isArray(updates[k])) {
      return JSON.stringify(updates[k]) !== JSON.stringify(recordData[k]);
    }
    return updates[k] !== recordData[k];
  });
};

const processHierarchyIds = async (hierarchy_ids: string[] | undefined, customFieldId: string) => {
  if (!hierarchy_ids || hierarchy_ids.length === 0) return;

  const existingHierarchyRecords = await customFieldsHierarchie.findAll({ where: { custom_field_id: customFieldId } });
  const existingHierarchyIds = existingHierarchyRecords.map((record) => record.hierarchy_id);

  await Promise.all(hierarchy_ids.map(async (hierarchy_id) => {
    const existingRecord = existingHierarchyRecords.find((record) => record.hierarchy_id === hierarchy_id);
    if (!existingRecord) {
      await customFieldsHierarchie.create({ custom_field_id: customFieldId, hierarchy_id });
    }
  }));

  const hierarchyIdsToDelete = existingHierarchyIds.filter(existingId => !hierarchy_ids.includes(existingId));
  if (hierarchyIdsToDelete.length > 0) {
    await customFieldsHierarchie.destroy({ where: { custom_field_id: customFieldId, hierarchy_id: hierarchyIdsToDelete } });
  }
};

const processWorkLocationIds = async (work_location_ids: string[] | undefined, customFieldId: string) => {
  if (!work_location_ids || work_location_ids.length === 0) return;

  const existingWorkLocationRecords = await customFieldLocations.findAll({ where: { custom_field_id: customFieldId } });
  const existingWorkLocationIds = existingWorkLocationRecords.map((record) => record.work_location_id);

  await Promise.all(work_location_ids.map(async (work_location_id) => {
    const existingRecord = existingWorkLocationRecords.find((record) => record.work_location_id === work_location_id);
    if (!existingRecord) {
      await customFieldLocations.create({ custom_field_id: customFieldId, work_location_id });
    }
  }));

  const workLocationIdsToDelete = existingWorkLocationIds.filter(existingId => !work_location_ids.includes(existingId));
  if (workLocationIdsToDelete.length > 0) {
    await customFieldLocations.destroy({ where: { custom_field_id: customFieldId, work_location_id: workLocationIdsToDelete } });
  }
};

const processMasterDataIds = async (master_data_ids: string[] | undefined, customFieldId: string) => {
  if (!master_data_ids || master_data_ids.length === 0) return;

  const existingMasterDataRecords = await customFieldMasterData.findAll({ where: { custom_field_id: customFieldId } });
  const existingMasterDataIds = existingMasterDataRecords.map((record) => record.master_data_id);

  await Promise.all(master_data_ids.map(async (master_data_id) => {
    const existingRecord = existingMasterDataRecords.find((record) => record.master_data_id === master_data_id);
    if (!existingRecord) {
      await customFieldMasterData.create({ custom_field_id: customFieldId, master_data_id });
    }
  }));

  const masterDataIdsToDelete = existingMasterDataIds.filter(existingId => !master_data_ids.includes(existingId));
  if (masterDataIdsToDelete.length > 0) {
    await customFieldMasterData.destroy({ where: { custom_field_id: customFieldId, master_data_id: masterDataIdsToDelete } });
  }
};

const processLinkedModules = async (linked_modules: Array<{ is_linked: boolean }> | undefined, customFieldId: string, program_id: string) => {
  if (linked_modules?.every((module) => module.is_linked === false)) {
    await CustomField.update({ is_linked: false }, { where: { id: customFieldId, program_id } });
  }
};
export const deleteCustomField = async (request: FastifyRequest<{ Params: { id: string, program_id: string } }>, reply: FastifyReply) => {
  const { id, program_id } = request.params;

  try {
    const customFieldItem = await CustomField.findOne({ where: { id, program_id } });

    if (customFieldItem) {

      // Check if customFieldItem is linked with modules
      // Assuming you have a function to check this, replace it with your actual logic

      if ((customFieldItem as any).is_linked === false) {
        await customFieldItem.update({ is_deleted: true }, { where: { id, program_id } });
        reply.status(200).send({
          status_code: 200,
          message: 'Custom Field marked as deleted successfully',
          trace_id: generateCustomUUID(),
        });
      } else {
        reply.status(500).send({
          status_code: 500,
          message: 'Custom Field cannot be deleted as it is linked with modules.',
          trace_id: generateCustomUUID(),
        });

      }
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Custom Field not found',
        trace_id: generateCustomUUID(),
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: generateCustomUUID(),
      error: error
    });
  }
};



export async function updateCustomFieldsIsdisable(
  request: FastifyRequest<{ Params: { id: string, program_id: string }; Body: { is_enabled: boolean } }>,
  reply: FastifyReply
) {
  const { id, program_id } = request.params;
  const { is_enabled } = request.body;

  const allowedFields = ['is_enabled'];
  const requestBodyFields = Object.keys(request.body);

  const invalidFields = requestBodyFields.filter(field => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    return reply.status(400).send({
      status_code: 400,
      message: `Invalid request: fields ${invalidFields.join(', ')} are not allowed.`,
      trace_id: generateCustomUUID(),
    });
  }

  if (is_enabled === undefined || is_enabled === null) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Invalid request: is_enabled field is required.',
      trace_id: generateCustomUUID(),
    });
  }

  try {
    // Retrieve the record first
    const customFieldRecord = await CustomField.findOne({ where: { id, program_id } });

    if (customFieldRecord) {
      // Update the is_enabled field
      await CustomField.update(
        { is_enabled },
        {
          where: { id, program_id },
        }
      );

      const linkedModules = customFieldRecord.linked_modules;
      const updatedLinkedModules = linkedModules.map((module: any) => ({
        ...module,
        is_linked: is_enabled,
      }));

      // Save the updated linked_modules back to the database
      await CustomField.update(
        { linked_modules: updatedLinkedModules },
        {
          where: { id, program_id },
        }
      );

      return reply.status(200).send({
        status_code: 200,
        message: 'Custom field updated successfully.',
        trace_id: generateCustomUUID(),
      });
    } else {
      return reply.status(404).send({
        status_code: 404,
        message: 'Custom field not found',
        trace_id: generateCustomUUID(),
      });
    }
  } catch (error) {
    console.error('Error updating custom field:', error); // Log the error details
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error: Failed to update Custom Field',
      trace_id: generateCustomUUID(),
    });
  }
}

export async function searchCustomFields(
  request: FastifyRequest<{ Querystring: GetQueryInterface, Params: { program_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { module_name, is_enabled, field_type } = request.query;
    const { program_id } = request.params; 
    const searchFields: any = { is_deleted: false };

    if (module_name) {
      searchFields.module_name = module_name;
    }
    if (is_enabled) {
      searchFields.is_enabled = is_enabled === "true" ? 1 : 0;
    }

    if (field_type) {
      const fieldTypesArray = field_type.split(","); 
      searchFields.field_type = { [Op.in]: fieldTypesArray };
    }

    if (program_id) {
      searchFields.program_id = program_id;
    }

    const result = await CustomField.findAndCountAll({
      where: searchFields,
    });

    if (result.rows.length === 0) {
      reply.status(200).send({ message: "Modules not found", modules: [] });
      return;
    }

    reply.status(200).send({
      status_code: 200,
      total_records: result.count,
      items: result.rows,
    });
  } catch (error: any) {
    console.log(error.stack);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}




