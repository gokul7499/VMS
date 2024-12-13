
import feesConfiguration from '../models/feesConfigModel';
import { FeesConfigurationInterface } from '../interfaces/feesConfigInterface';
import { FastifyReply, FastifyRequest } from 'fastify';
import { baseSearch, BaseService } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';
import Hierarchy from '../models/hierarchies.model';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, Sequelize } from 'sequelize';
import IndustriesModel from '../models/industries.model';
import { ProgramVendor } from '../models/program-vendor.model';
const baseService = new BaseService(feesConfiguration);

export async function createFeesConfiguration(
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply,
) {
  const feesConfig = request.body as FeesConfigurationInterface;
  const traceId = generateCustomUUID()
  const { program_id } = request.params;

  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
  }

  logger(
    {
      trace_id: traceId,
      actor: {
        user_name: user?.preferred_username,
        user_id: user?.sub,
      },
      data: request.body,
      eventname: "creating fees configuration",
      status: "success",
      description: `Creating fees configuration`,
      level: 'info',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    },
    feesConfiguration
  );

  try {
    const existingConfig = await feesConfiguration.findOne({
      where: {
        program_id: program_id,
        title: feesConfig.title
      }
    });

    if (existingConfig) {
      return reply.status(409).send({
        message: 'Fees configuration with this name already exists'
      });
    }
    const fees: any = await feesConfiguration.create({ ...feesConfig, program_id });
    reply.status(201).send({
      status_code: 201,
      message: "fess configration created succesfully",
      fees_config: fees,
      trace_id: traceId
    });

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "created fees configuration",
        status: "success",
        description: `Created fees configuration successfully`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      feesConfiguration
    );
  } catch (error) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "created fees configuration",
        status: "error",
        description: `Error creating fees configuration`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      feesConfiguration
    );

    reply.status(500).send({
      message: 'An error occurred while creating fees configuration',
      error
    });
  }
}

export async function getFeesConfigurationById(
  request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id, program_id } = request.params;
    const fees = await feesConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });

    if (fees) {
      const hierarchyLevels = fees.hierarchy_levels || [];
      const laborCategoryIds = fees.labor_category || [];
      const vendorIds = fees.vendors || [];
      const getHierarchies = async (hierarchyIds: string[]) => {
        const hierarchies = await Hierarchy.findAll({
          where: {
            id: hierarchyIds,
          },
        });

        return hierarchies.map((hierarchy: any) => ({
          id: hierarchy.id,
          name: hierarchy.name,
          parent_hierarchy_id: hierarchy.parent_hierarchy_id,
        }));
      };

      const hierarchyData = await getHierarchies(hierarchyLevels);
      const laborCategories = await IndustriesModel.findAll({
        where: {
          id: laborCategoryIds,
        },
        attributes: ['id', 'name'],
      });
      const vendors = await ProgramVendor.findAll({
        where: {
          id: vendorIds
        },
        attributes: ['id', 'vendor_name'],
      });

      reply.status(200).send({
        status_code: 200,
        message: "Fees configuration retrieved successfully",
        fees: {
          ...fees.dataValues,
          hierarchy_levels: hierarchyData,
          labor_category: laborCategories.map((category: any) => ({
            id: category.id,
            name: category.name,
          })),
          vendors: vendors.map((vendor: any) => ({
            id: vendor.id,
            name: vendor.vendor_name,
          })),
        },
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Fees configuration data not found",
        fees_config: [],
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: "An error occurred while fetching fees configuration",
      error,
    });
  }
}

export async function updateFeesConfigurationById(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const updates = request.body as Partial<FeesConfigurationInterface>;
  try {
    const feesConfigData = await feesConfiguration.findByPk(id);
    if (!feesConfigData) {
      return reply.status(200).send({ message: 'fees configuration data not found' });
    }
    const [feesConfig] = await feesConfiguration.update(updates, { where: { id, program_id } });
    return reply.status(201).send({
      status_code: 201,
      message: 'fees configuration updated successfully',
      id: feesConfigData.id,
      fees_config: feesConfig,
      trace_id: generateCustomUUID()
    });
  } catch (error) {
    console.error('error updating fees configuration fees configuration', error);
    return reply.status(500).send({ message: 'Internal Server Error', error });
  }
}

export async function deleteFeesConfigurationById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const [feesConfig] = await feesConfiguration.update(
      {
        is_deleted: true,
        is_enabled: false,
        modified_on: Date.now(),
      },
      { where: { id } }
    );
    if (feesConfig > 0) {
      reply.status(200).send({
        status_code: 200,
        message: "Fees configuration deleted successfully",
        feesConfig: feesConfig,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({ message: 'Fees configuration not found' });
    }
  } catch (error) {
    console.error('Error deleting fees configuration:', error);
    reply.status(500).send({ message: 'An error occurred while deleting fees configuration', error });
  }
}

export async function getAllFeesConfigByProgramId(request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply) {
  const searchFields = ['program_id', 'is_enabled', 'title', 'source_model', 'labor_category', 'hierarchy_levels', 'vendors', 'modified_on'];
  const responseFields = ['id', 'title', 'labor_category', 'hierarchy_levels', 'vendors', 'source_model', 'is_enabled',
    'is_deleted', 'program_id', 'created_on', 'modified_on', 'ref_id',];
  return baseSearch(request, reply, feesConfiguration, searchFields, responseFields);
}

export async function advancedSearchFeesConfiguration(
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { program_id } = request.params;
    const result = await baseService.advancedFilter(request, program_id, []);

    if (result.count > 0) {
      return reply.status(200).send({
        status_code: 200,
        total_records: result.count,
        items: result.rows,
      });
    } else {
      return reply.status(200).send({
        message: "No records found",
        status_code: 200,
        total_records: 0,
        items: [],
      });
    }
  } catch (error) {
    return reply.status(500).send({
      message: "Internal Server Error",
      status_code: 500,
    });
  }
}


export async function getFeesConfig(
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: { hierarchy_levels?: string; vendors?: string; labor_category?: string; source_model?: string; is_enabled?: string };
  }>,
  reply: FastifyReply
) {
  const trace_id = generateCustomUUID();
  try {
    const { program_id } = request.params;
    const { hierarchy_levels, vendors, labor_category, source_model, is_enabled } = request.query;
    const hierarchyLevelsArray = Array.isArray(hierarchy_levels) ? hierarchy_levels : (hierarchy_levels ?? '').split(',');

    const whereConditions: any = {
      program_id,
      is_enabled: is_enabled ? is_enabled === "true" : undefined,
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn('JSON_CONTAINS', Sequelize.col('hierarchy_levels'), JSON.stringify(hierarchyLevelsArray)),
          true
        ),
        Sequelize.where(
          Sequelize.fn('JSON_CONTAINS', Sequelize.col('labor_category'), JSON.stringify(labor_category)),
          true
        ),
        Sequelize.where(
          Sequelize.fn('JSON_CONTAINS', Sequelize.col('source_model'), JSON.stringify(source_model)),
          true
        ),
        {
          [Op.or]: [
            Sequelize.where(
              Sequelize.fn('JSON_CONTAINS', Sequelize.col('vendors'), JSON.stringify(vendors)),
              true
            ),
            {
              [Op.not]: Sequelize.literal(`
                NOT EXISTS (
                  SELECT 1
                  FROM fees AS sub_fees
                  WHERE
                    JSON_CONTAINS(sub_fees.hierarchy_levels, '${JSON.stringify(hierarchyLevelsArray)}') = TRUE
                    AND JSON_CONTAINS(sub_fees.labor_category, '${JSON.stringify(labor_category)}') = TRUE
                    AND JSON_CONTAINS(sub_fees.source_model, '${JSON.stringify(source_model)}') = TRUE
                    AND sub_fees.program_id = '${program_id}'
                    AND JSON_LENGTH(sub_fees.vendors) > 0
                )
              `)
            }
          ]
        }
      ]
    };

    if (whereConditions.is_enabled === undefined) {
      delete whereConditions.is_enabled;
    }

    const data = await feesConfiguration.findAll({
      where: whereConditions,
    });

    reply.status(200).send({
      status_code: 200,
      fees: data,
      trace_id,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id,
    });
  }
}

