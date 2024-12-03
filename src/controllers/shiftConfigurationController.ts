import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from '../utility/genrateTraceId';
import ShiftType from '../models/shiftTypeModel'
import { ShiftConfigurationAttributes } from "../interfaces/shiftConfigurationInterface";
import ShiftConfiguration from "../models/shiftConfigurationModel";
import shiftConfigurationHierarchies from "../models/shiftConfigurationHierarchiesModel";
import hierarchies from "../models/hierarchiesModel"
import { sequelize } from '../config/instance';
import ShiftConfigJobTemplate from "../models/ShiftConfigJobTemplatesModels";
import { Op } from 'sequelize';
import shiftTypeConfiguration from "../models/shiftTypeConfigurationModel";

export const getAllshiftConfiguration = async (
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: {
      name?: string;
      is_enabled?: boolean;
      modified_on?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) => {
  const trace_id = generateCustomUUID();
  const { program_id } = request.params;
  const { name, is_enabled, modified_on, page = '1', limit = '10' } = request.query;

  if (!program_id) {
    reply.status(400).send({
      statusCode: 400,
      message: 'Program ID is required',
      trace_id,
    });
    return;
  }

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    reply.status(400).send({
      statusCode: 400,
      message: 'Invalid page number',
      trace_id,
    });
    return;
  }

  if (isNaN(pageSize) || pageSize < 1) {
    reply.status(400).send({
      statusCode: 400,
      message: 'Invalid limit',
      trace_id,
    });
    return;
  }

  const offset = (pageNumber - 1) * pageSize;

  try {
    const searchFilters: any = { program_id };

    if (name) {
      searchFilters.name = { [Op.like]: `%${name}%` };
    }

    if (is_enabled !== undefined) {
      searchFilters.is_enabled = is_enabled
    }

    if (modified_on) {
      searchFilters.modified_on = { [Op.gte]: new Date(modified_on) };
    }

    const { count, rows: shiftConfigData } = await ShiftConfiguration.findAndCountAll({
      where: searchFilters,
      limit: pageSize,
      offset
    });

    if (shiftConfigData.length > 0) {
      const shiftConfigIds = shiftConfigData.map(config => config.id);
      const hierarchyRecords = await shiftConfigurationHierarchies.findAll({
        where: { shift_config_id: shiftConfigIds },
        attributes: ['shift_config_id', 'hierarchy_id'],
      });
      const hierarchyIds = hierarchyRecords.map(record => record.hierarchy_id);
      const hierarchiesList = await hierarchies.findAll({
        where: { id: hierarchyIds },
        attributes: ['id', 'name'],
      });

      const shiftTypeRecords = await shiftTypeConfiguration.findAll({
        where: { shift_config_id: shiftConfigIds },
        attributes: ['shift_config_id', 'shift_type_id'],
      });

      const shiftTypeIds = shiftTypeRecords.map(record => record.shift_type_id);

      const shiftTypesList = await ShiftType.findAll({
        where: { id: shiftTypeIds },
        attributes: ['id', 'shift_type_name', 'created_on'],
      });

      const shiftConfigsWithDetails = await Promise.all(
        shiftConfigIds.map(async (shiftConfigId) => {
          const jobTemplateRecords = await ShiftConfigJobTemplate.findAll({
            where: { shift_config_id: shiftConfigId },
            attributes: ['job_template_id'],
          });

          const jobTemplateIds = jobTemplateRecords.map(record => record.job_template_id);

          let jobTemplates: unknown[] = [];
          if (jobTemplateIds.length > 0) {
            const jobTemplateIdsString = jobTemplateIds.map(id => `'${id}'`).join(', ');

            const [jobTemplatesData] = await sequelize.query(
              `SELECT id, template_name, description FROM job_templates WHERE id IN (${jobTemplateIdsString})`
            );

            jobTemplates = jobTemplatesData;
          }

          const shiftTypesForConfig = shiftTypeRecords
            .filter(record => record.shift_config_id === shiftConfigId)
            .map(record => shiftTypesList.find(shiftType => shiftType.id === record.shift_type_id));

          const hierarchyConfig = hierarchyRecords
            .filter(record => record.shift_config_id === shiftConfigId)
            .map(record => hierarchiesList.find(hierarchy => hierarchy.id === record.hierarchy_id));

          return {
            ...shiftConfigData.find(config => config.id === shiftConfigId)?.toJSON(),
            hierarchies: hierarchyConfig,
            shift_types: shiftTypesForConfig,
            job_templates: jobTemplates,
          };
        })
      );

      reply.status(200).send({
        statusCode: 200,
        page: pageNumber,
        limit: pageSize,
        total_records: count,
        shiftConfigurations: shiftConfigsWithDetails,
        message: 'Shift configurations retrieved successfully',
        trace_id,
      });
    } else {
      reply.status(200).send({
        statusCode: 200,
        shiftConfigurations: [],
        message: 'Shift configurations not found',
        trace_id,
      });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'Internal server error',
      trace_id,
    });
  }
};

export async function getShiftConfigurationById(request: FastifyRequest<{ Params: { id: string; program_id: string } }>, reply: FastifyReply) {
  const trace_id = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const item = await ShiftConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });

    if (!item) {
      return reply.status(200).send({
        statusCode: 200,
        shiftConfiguration: {},
        message: 'Shift Configuration not found.',
        trace_id,
      });
    }

    const shiftConfigId = item.id;

    const hierarchyRecords = await shiftConfigurationHierarchies.findAll({
      where: { shift_config_id: shiftConfigId },
      attributes: ['hierarchy_id'],
    });
    const hierarchyIds = hierarchyRecords.map((record) => record.hierarchy_id);

    const hierarchiesList = await hierarchies.findAll({
      where: { id: hierarchyIds },
      attributes: ['id', 'name'],
    });

    const jobTemplateRecords = await ShiftConfigJobTemplate.findAll({
      where: { shift_config_id: shiftConfigId },
      attributes: ['job_template_id'],
    });
    const jobTemplateIds = jobTemplateRecords.map((record) => record.job_template_id);

    let jobTemplates: unknown[] = [];
    if (jobTemplateIds.length > 0) {
      const [jobTemplatesData] = await sequelize.query(
        `SELECT id, template_name, description FROM job_templates WHERE id IN (:jobTemplateIds)`,
        { replacements: { jobTemplateIds } }
      );

      jobTemplates = jobTemplatesData;
    }

    const shiftTypeRecords = await shiftTypeConfiguration.findAll({
      where: { shift_config_id: shiftConfigId },
      attributes: ['shift_type_id'],
    });


    const shiftTypeIds = shiftTypeRecords.map((record) => record.shift_type_id);

    let shiftTypesList: unknown[] = [];
    if (shiftTypeIds.length > 0) {
      shiftTypesList = await ShiftType.findAll({
        where: { id: shiftTypeIds },
        attributes: ['id', 'shift_type_name', 'created_on','shift_type_time','time_duration'],
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      trace_id,
      shiftConfiguration: {
        ...item.toJSON(),
        hierarchies: hierarchiesList,
        job_templates: jobTemplates,
        shift_types: shiftTypesList,
      },
    });
  } catch (error) {
    return reply.status(500).send({
      statusCode: 500,
      trace_id,
      message: 'Internal server error',
    });
  }
}

export async function createShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const transaction = await sequelize.transaction();
  const trace_id = generateCustomUUID();
  try {
    const shiftTypeData = request.body as ShiftConfigurationAttributes;
    const { hierarchy_ids, job_template_ids, shift_type_ids, name, ...rest } = shiftTypeData;
    const existingShiftConfig = await ShiftConfiguration.findOne({
      where: { name, program_id: shiftTypeData.program_id },
    });

    if (existingShiftConfig) {
      await transaction.rollback();
      return reply.status(400).send({
        statusCode: 400,
        trace_id,
        message: `Shift configuration with the name ${name} already exists`,
      });
    }
    const shiftType = await ShiftConfiguration.create({ name, ...rest }, { transaction });

    if (Array.isArray(hierarchy_ids)) {
      const hierarchyPromises = hierarchy_ids.map((hierarchy_id: any) => {
        return shiftConfigurationHierarchies.create({
          shift_config_id: shiftType.id,
          hierarchy_id,
        }, { transaction });
      });
      await Promise.all(hierarchyPromises);
    }

    if (Array.isArray(shift_type_ids)) {
      const shifttypePromises = shift_type_ids.map((shift_type_id: any) => {
        return shiftTypeConfiguration.create({
          shift_config_id: shiftType.id,
          program_id: shiftType.program_id,
          shift_type_id,
        }, { transaction });
      });
      await Promise.all(shifttypePromises);
    }

    if (Array.isArray(job_template_ids)) {
      const jobTemplatePromises = job_template_ids.map((job_template_id: any) => {
        return ShiftConfigJobTemplate.create({
          shift_config_id: shiftType.id,
          job_template_id,
        }, { transaction });
      });
      await Promise.all(jobTemplatePromises);
    }

    await transaction.commit();
    reply.status(201).send({
      statusCode: 201,
      id: shiftType.id,
      message: 'Shift configuration created successfully',
      trace_id,
    });

  } catch (error) {
    await transaction.rollback();
    reply.status(500).send({
      statusCode: 500,
      trace_id,
      message: (error instanceof Error) ? error.message : 'An unknown error occurred'
    });
  }
}

export async function updateShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const shiftTypeData = request.body as ShiftConfigurationAttributes;
  const trace_id = generateCustomUUID();
  try {
    const shiftType = await ShiftConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });
    if (shiftType) {
      const existingShiftTypeConfigWithSameName = await ShiftConfiguration.findOne({
        where: {
          name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', shiftTypeData.name)),
          id: { [Op.ne]: id },
          program_id,
          is_deleted: false,
        },
      });
      if (existingShiftTypeConfigWithSameName) {
        return reply.status(400).send({
          statusCode: 400,
          message: `Shift configuration with the name ${shiftTypeData.name} already exists`,
          trace_id,
        });
      }
      await shiftType.update(shiftTypeData);
      reply.status(200).send({
        statusCode: 200,
        message: 'Shift configuration updated successfully.',
        trace_id,
      });
    } else {
      reply.status(200).send({
        statusCode: 200,
        message: 'Shift configuration not found.',
        trace_id,
      });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'Internal server error',
      trace_id,
    });
  }
}

export async function deleteShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const trace_id = generateCustomUUID();
  try {
    const shiftConfiguration = await ShiftConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });
    if (shiftConfiguration) {
      await shiftConfiguration.update({ is_deleted: true, is_enabled: false });
      reply.status(200).send({
        statusCode: 200,
        trace_id,
        message: 'Shift configuration deleted successfully.',
      });
    } else {
      reply.status(200).send({
        statusCode: 200,
        message: 'Shift configuration not found.',
        trace_id,
      });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      trace_id,
      message: "Internal server error"
    });
  }
}