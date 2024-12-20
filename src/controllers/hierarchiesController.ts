import { FastifyRequest, FastifyReply } from 'fastify';
import { hierarchiesData } from '../interfaces/hierarchiesInterface';
import { baseSearch, advanceSearch } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';
import HierarchiesModel from '../models/hierarchiesModel';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/instance';
import { getAllHierarchies, getHierarchieWithChildren, getMasterDataForHeirarchiesQuery, hierarchyDetailsQuery, masterDataQuery, parentRateModelQuery } from '../utility/queries';
import TimeZone from '../models/timeZoneModel';
import Currencies from '../models/currenciesModel';
import HierarchyMasterData from '../models/hierarchyMasterDataModel';

interface HierarchyItem {
  id: string;
  parent_hierarchy_id: string | null;
  name: string;
  is_enabled: boolean;
  preferred_date_format: string;
  rate_model: string;
  created_on: number;
  modified_on: number;
  code: string;
  program_id: string;
}

export const getHierarchiesByProgram = async (
  request: FastifyRequest<{ Params: { program_id: string, id?: string } }>,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params;
  const traceId = generateCustomUUID();

  try {
    const hierarchiesWithChildren: HierarchyItem[] = await sequelize.query(getHierarchieWithChildren, {
      replacements: { program_id },
      type: QueryTypes.SELECT
    });

    if (hierarchiesWithChildren.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: 'No hierarchy found for the given program',
        trace_id: traceId,
        hierarchies: [],
      });
    }

    const filteredHierarchies = id
      ? hierarchiesWithChildren.filter((item) => item.id === id)
      : hierarchiesWithChildren;

    const buildHierarchy = (data: HierarchyItem[], parentId: string | null = null): any[] => {
      return data
        .filter((item) => item.parent_hierarchy_id === parentId)
        .map((item) => {
          return {
            id: item.id,
            parent_hierarchy_id: item.parent_hierarchy_id,
            name: item.name,
            is_enabled: item.is_enabled,
            preferred_date_format: item.preferred_date_format,
            rate_model: item.rate_model,
            created_on: item.created_on,
            modified_on: item.modified_on,
            code: item.code,
            program_id: item.program_id,
            hierarchies: buildHierarchy(data, item.id),
          };
        });
    };

    const nestedHierarchy = buildHierarchy(filteredHierarchies);

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      hierarchies: nestedHierarchy,
    });
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching hierarchy by program',
      trace_id: traceId,
    });
  }
};

export const getHierarchies = async (
  request: FastifyRequest<{
    Params: { program_id: string },
    Querystring: { name?: string; is_enabled?: boolean | string; modified_on?: string }
  }>,
  reply: FastifyReply
) => {
  const { program_id } = request.params;
  const { name, is_enabled, modified_on } = request.query;
  const traceId = generateCustomUUID();

  try {
    const hasName = !!name;

    const isEnabledValue =
      typeof is_enabled === "string" ? (is_enabled === "true" ? 1 : 0) : (is_enabled === true ? 1 : is_enabled === false ? 0 : undefined);

    let startDate;
    let endDate;

    if (modified_on) {
      const dateRange = modified_on.split(',');
      if (dateRange.length === 2) {
        startDate = parseInt(dateRange[0], 10);
        endDate = parseInt(dateRange[1], 10);
      }
    }
    const hierarchies = await sequelize.query(getAllHierarchies(hasName, !!is_enabled, startDate, endDate), {
      replacements: {
        program_id,
        ...(hasName && { name: `%${name}%` }),
        ...(isEnabledValue !== undefined && { is_enabled: isEnabledValue }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
      },
      type: QueryTypes.SELECT,
    });

    if (hierarchies.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No hierarchy found for the given program",
        total_records: 0,
        hierarchies: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Hierarchy fetched successfully.",
      total_records: hierarchies.length,
      hierarchies,
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "An error occurred while fetching hierarchies",
    });
  }
};

interface MasterDataResult {
  foundational_data: string | null;
  parent_hierarchy_name: string | null;
}

export async function getHierarchiesById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const hierarchy = await HierarchiesModel.findByPk(id, {
      include: [
        {
          model: TimeZone,
          as: 'time_zones',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
        {
          model: TimeZone,
          as: 'default_timezone',
          attributes: ['id', 'name']
        },
        {
          model: Currencies,
          as: 'currency',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (hierarchy) {
      const hierarchyData = hierarchy.toJSON();
      hierarchyData.timezone_id = hierarchyData.time_zones.map((tz: any) => ({
        id: tz.id,
        name: tz.name,
      }));
      delete hierarchyData.time_zones;

      const [masterDataResult] = await sequelize.query<MasterDataResult>(masterDataQuery, {
        replacements: { hierarchy_id: id },
        type: QueryTypes.SELECT,
      });

      if (masterDataResult) {
        // Handle foundational_data
        const parsedData =
          typeof masterDataResult.foundational_data === 'string'
            ? JSON.parse(masterDataResult.foundational_data)
            : masterDataResult.foundational_data;

        hierarchyData.foundational_data = Array.isArray(parsedData)
          ? parsedData.filter((item) => item.id !== null && item.name !== null)
          : [];

        // Include parent_hierarchy_name
        hierarchyData.parent_hierarchy_name = masterDataResult.parent_hierarchy_name || null;
      } else {
        hierarchyData.foundational_data = [];
        hierarchyData.parent_hierarchy_name = null;
      }

      return reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        hierarchies: hierarchyData,
      });
    } else {
      return reply.status(200).send({
        message: 'Hierarchy not found',
        hierarchies: [],
      });
    }
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      message: 'An error occurred while fetching Hierarchy by ID',
      error: (error as Error).message,
    });
  }
}

export async function createHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const hierarchie = request.body as hierarchiesData;
  const program_id = hierarchie.program_id;
  const hierarchyName = hierarchie.name;
  const hierarchyCode = hierarchie.code;
  const trace_id = generateCustomUUID();

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }
  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
  }

  logger({
    trace_id,
    actor: { user_name: user?.preferred_username, user_id: user?.sub },
    data: request.body,
    eventname: "creating hierarchies",
    status: "in_progress",
    description: `Creating hierarchies for ${program_id}`,
    level: 'info',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, HierarchiesModel);

  const transaction = await sequelize.transaction();
  try {
    const nameExists = await HierarchiesModel.findOne({
      where: { name: hierarchyName, program_id, is_deleted: false },
      transaction,
    });

    if (nameExists) {
      await transaction.rollback();
      return reply.status(409).send({
        status_code: 409,
        message: "Hierarchy name is already exist",
      });
    }

    const codeExists = await HierarchiesModel.findOne({
      where: { code: hierarchyCode, program_id, is_deleted: false },
      transaction,
    });

    if (codeExists) {
      await transaction.rollback();
      return reply.status(409).send({
        status_code: 409,
        message: "Hierarchy code is already in use",
      });
    }
    const newItem = await HierarchiesModel.create({ ...hierarchie }, { transaction });

    const foundationalData = hierarchie.foundational_data;
    if (Array.isArray(foundationalData)) {
      await Promise.all(
        foundationalData.map(async (foundation: any) => {
          await HierarchyMasterData.create({
            hierarchy_id: newItem.id,
            foundation_data_type_id: foundation
          }, { transaction });
        })
      );
    }

    if (hierarchie.timezone_id) {
      await setAssociations(newItem, hierarchie, transaction);
    }

    await transaction.commit();

    logger({
      trace_id,
      actor: { user_name: user?.preferred_username, user_id: user?.sub },
      data: request.body,
      eventname: "created hierarchies",
      status: "success",
      description: `Created hierarchies for ${program_id} successfully: ${newItem.id}`,
      level: 'success',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    }, HierarchiesModel);

    return reply.status(201).send({
      status_code: 201,
      message: 'Hierarchy Created Successfully',
      data: newItem,
      trace_id: generateCustomUUID(),
    });

  } catch (error) {
    await transaction.rollback();
    logger({
      trace_id,
      actor: { user_name: user?.preferred_username, user_id: user?.sub },
      data: request.body,
      eventname: "creating hierarchies",
      status: "error",
      description: `Error creating hierarchies for ${program_id}`,
      level: 'error',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    }, HierarchiesModel);

    console.error(error);
    return reply.status(500).send({
      message: 'Failed To Create Hierarchy',
      error: (error as any).message
    });
  }
}

const setAssociations = async (newItem: any, hierarchies: hierarchiesData, transaction: any) => {
  if (hierarchies.timezone_id && Array.isArray(hierarchies.timezone_id)) {
    await newItem.setTime_zones(hierarchies.timezone_id, { transaction });
  }
};

export async function updateHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const hierarchiesData = request.body as hierarchiesData;
  const traceId = generateCustomUUID();

  try {
    const hierarchy = await HierarchiesModel.findByPk(id);

    if (!hierarchy) {
      return reply.status(404).send({
        status_code: 404,
        message: "Hierarchy not found",
        trace_id: traceId,
      });
    }

    const transaction = await sequelize.transaction();
    try {
      // Selectively update fields if parent_hierarchy_id is null
      if (hierarchy.parent_hierarchy_id === null) {
        const { is_enabled, parent_hierarchy_id, ...updatableData } = hierarchiesData;
        await hierarchy.update(updatableData, { transaction });
      } else {
        await hierarchy.update(hierarchiesData, { transaction });
      }

      // Update associated data if timezone_id exists
      if (hierarchiesData.timezone_id) {
        await setAssociations(hierarchy, hierarchiesData, transaction);
      }

      const foundationalData = hierarchiesData.foundational_data;
      if (Array.isArray(foundationalData)) {
        await HierarchyMasterData.destroy({
          where: { hierarchy_id: hierarchy.id },
          transaction,
        });

        await Promise.all(
          foundationalData.map(async (foundation: any) => {
            await HierarchyMasterData.create(
              {
                hierarchy_id: hierarchy.id,
                foundation_data_type_id: foundation,
              },
              { transaction }
            );
          })
        );
      }

      await transaction.commit();
      return reply.status(200).send({
        status_code: 200,
        message: "Hierarchy updated successfully",
        trace_id: traceId,
      });
    } catch (error) {
      await transaction.rollback();
      return reply.status(500).send({
        status_code: 500,
        message: "Failed to update hierarchy",
        trace_id: traceId,
      });
    }
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
    });
  }
}

export async function deleteHierarchies(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params;
    const hierarchy = await HierarchiesModel.findOne({ where: { id } });

    if (!hierarchy) {
      return reply.status(404).send({
        status_code: 404,
        message: 'Hierarchy not found',
        trace_id: traceId
      });
    }

    if (hierarchy.parent_hierarchy_id === null) {
      return reply.status(400).send({
        status_code: 400,
        message: "This hierarchy cannot be deleted because it has no parent.",
        trace_id: traceId
      });
    }

    const [updatedRows] = await HierarchiesModel.update(
      {
        is_deleted: true,
        is_enabled: false,
        modified_on: Date.now(),
      },
      { where: { id } }
    );

    if (updatedRows > 0) {
      reply.status(200).send({
        status_code: 200,
        message: "Hierarchy deleted successfully",
        trace_id: traceId
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: "Hierarchy not found",
        trace_id: traceId
      });
    }
  } catch (error) {
    console.error('Error deleting hierarchy:', error);
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while deleting the hierarchy.',
      error,
      trace_id: traceId
    });
  }
}

export async function searchHierarchies(request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply) {

  const searchFields = ['is_enabled', 'name', 'code', 'program_id'];
  const responseFields = ['id', 'name', 'modified_on', 'is_enabled', 'program_id'];
  return baseSearch(request, reply, HierarchiesModel, searchFields, responseFields);
}

export async function advancedSearchHierarchies(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const searchFields = ['name', 'modified_on', 'is_enabled', 'name', 'code', 'program_id'];
  const responseFields = ['id', 'name', 'modified_on', 'is_enabled', 'code', 'program_id'];
  return advanceSearch(
    request,
    reply,
    HierarchiesModel,
    searchFields,
    responseFields
  );
}
interface Hierarchy {
  rate_model: string;
  id: string;
  name: string;
  parent_hierarchy_id: string | null;
  parent_name: string | null;
  hierarchies: Hierarchy[];
}

export const getRateModel = async (
  request: FastifyRequest<{ Querystring: { hierarchy_ids: string }, Params: { program_id: string } }>,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { hierarchy_ids } = request.query;
  const { program_id } = request.params;

  try {
    const hierarchyIdsArray = hierarchy_ids.split(',');
    const hierarchyDetailsResult = await sequelize.query(hierarchyDetailsQuery, {
      replacements: {
        hierarchyIds: hierarchyIdsArray,
        programId: program_id,
      },
      type: QueryTypes.SELECT,
    });

    if (hierarchyDetailsResult.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: 'Rate model found but no hierarchies associated!',
        trace_id: traceId,
        rate_model: "No Rate Model Available",
        hierarchies: [],
      });
    }

    const hierarchyDetails: Hierarchy[] = hierarchyDetailsResult.map((item: any) => ({
      id: item.id,
      name: item.name,
      parent_hierarchy_id: item.parent_hierarchy_id,
      parent_name: item.parent_name,
      rate_model: item.rate,
      hierarchies: [],
    }));

    const hierarchyTree = buildHierarchyTree(hierarchyDetails);
    const rateModels = hierarchyDetails.map(h => h.rate_model);
    const uniqueRateModels = Array.from(new Set(rateModels));

    const finalRateModel = uniqueRateModels.length === 1
      ? uniqueRateModels[0]
      : findParentRateModel(hierarchyTree) || "No Rate Model Available";

    return reply.status(200).send({
      status_code: 200,
      message: 'Rate model found successfully!',
      trace_id: traceId,
      rate_model: finalRateModel,
      hierarchies: hierarchyTree,
    });

  } catch (error) {
    console.error(error);
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
    });
  }
};

function findParentRateModel(hierarchyTree: Hierarchy[]): string | null {
  let parentRateModel: string | null = null;

  const traverse = (node: Hierarchy) => {
    if (node.rate_model) {
      if (!parentRateModel) {
        parentRateModel = node.rate_model;
      }
    }
    node.hierarchies.forEach(traverse);
  };

  hierarchyTree.forEach(traverse);
  return parentRateModel;
}

function buildHierarchyTree(hierarchies: Hierarchy[]): Hierarchy[] {
  const map: { [key: string]: Hierarchy } = {};
  const roots: Hierarchy[] = [];
  hierarchies.forEach(hierarchy => {
    map[hierarchy.id] = { ...hierarchy, hierarchies: [] };
  });
  hierarchies.forEach(hierarchy => {
    if (hierarchy.parent_hierarchy_id) {
      const parent = map[hierarchy.parent_hierarchy_id];
      if (parent) {
        parent.hierarchies.push(map[hierarchy.id]);
      } else {
        roots.push(map[hierarchy.id]);
      }
    } else {
      roots.push(map[hierarchy.id]);
    }
  });
  return roots;
}

export const getMasterDataForHeirarchies = async (
  request: FastifyRequest<{ Params: { program_id: string }, Querystring: { hierarchy_ids?: string } }>,
  reply: FastifyReply
) => {
  const { hierarchy_ids } = request.query;
  const traceId = generateCustomUUID();

  if (!hierarchy_ids) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Missing required query parameter hierarchy_ids is required.'
    });
  }

  try {
    const hierarchyIdsArray = hierarchy_ids.split(',');

    const query = getMasterDataForHeirarchiesQuery();

    const results: {
      user_association_exclude: any;
      hierarchy_name: any;
      hierarchy_id: any; master_data: any[]
    }[] = await sequelize.query(query, {
      replacements: { hierarchy_ids: hierarchyIdsArray },
      type: QueryTypes.SELECT
    });

    if (!results || results.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'No master data found for the provided hierarchy IDs.',
        master_data: []
      });
    }

    const masterDataResponse = results.map(result => ({
      hierarchy_id: result.hierarchy_id,
      hierarchy_name: result.hierarchy_name,
      user_association_exclude: result.user_association_exclude,
      master_data: result.master_data
    }));

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: 'Master data for hierarchies retrieved successfully.',
      master_data: masterDataResponse
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: error.message
    });
  }
};