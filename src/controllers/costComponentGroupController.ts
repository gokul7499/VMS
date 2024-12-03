import { FastifyRequest, FastifyReply } from 'fastify';
import CostComponentGroup from '../models/costComponentGroupModel';
import { CostComponentGroupData } from '../interfaces/costComponentGroupInterface';
import CostComponentMapping from '../models/costComponentMappingModel';
import generateCustomUUID from '../utility/genrateTraceId';
import { sequelize } from '../config/instance';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const createCostComponentGroup = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name } = request.body as CostComponentGroupData;
  const { program_id } = request.params as { program_id: string };
  const trace_id = generateCustomUUID();

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
  }

  try {
    const existingCostComponentGroupWithSameName = await CostComponentGroup.findOne({
      where: { name, program_id },
    });

    if (existingCostComponentGroupWithSameName) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: request.body,
          eventname: "create cost component group",
          status: "error",
          description: `Error creating cost component group for ${program_id}: Name already exists`,
          level: 'error',
          action: request.method,
          url: request.url,
          entity_id: program_id,
          is_deleted: false
        },
        CostComponentGroup
      );

      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
      });
    }

    const { cost_component_ids } = request.body as any;
    if (Array.isArray(cost_component_ids) && cost_component_ids.length > 0) {
      for (const costComponentId of cost_component_ids) {
        await CostComponentMapping.create({
          program_id,
          cost_component_id: costComponentId,
        });
      }
    }

    const costComponentGroupPayload = request.body as Omit<CostComponentGroupData, '_id'>;
    const costComponentGroupData: any = await CostComponentGroup.create({ ...costComponentGroupPayload, program_id });

    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create cost component group",
        status: "success",
        description: `Created cost component group for ${program_id}: ${costComponentGroupData.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      CostComponentGroup
    );

    reply.status(201).send({
      status_code: 201,
      costComponentGroup: {
        id: costComponentGroupData?.id,
        name: costComponentGroupData?.name,
      },
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create cost component group",
        status: "error",
        description: `Error creating cost component group for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      CostComponentGroup
    );

    reply.status(500).send({
      message: 'Error While Creating Group',
      error: error,
      trace_id: generateCustomUUID(),
    });
  }
};

export const updateCostComponentGroup = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const costComponentGroupData = request.body as CostComponentGroupData;
  const { name } = request.body as CostComponentGroupData;
  const { cost_component_ids } = costComponentGroupData;
  const transaction = await sequelize.transaction();
  try {
    const existingCostComponentGroupWithSameName = await CostComponentGroup.findOne({
      where: {
        name,
        program_id,
        id: { [Op.ne]: id },
      },
    });

    if (existingCostComponentGroupWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
        trace_id: generateCustomUUID(),
      });
    }
    const data = await CostComponentGroup.findOne({
      where: { id, program_id, is_deleted: false },
      transaction
    });
    if (!data) {
      return reply.status(200).send({ message: 'Group Not Found.' });
    }
    await data.update(costComponentGroupData);

    if (cost_component_ids) {
      const existingMappings = await CostComponentMapping.findAll({
        where: { program_id },
        attributes: ['cost_component_id'],
        transaction
      });

      const existingMappingIds = existingMappings.map(mapping => mapping.cost_component_id);
      const mappingsToAdd = cost_component_ids.filter((id: any) => !existingMappingIds.includes(id));
      const mappingsToRemove = existingMappingIds.filter(id => !cost_component_ids.includes(id));

      if (mappingsToRemove.length > 0) {
        await CostComponentMapping.destroy(
          {
            where: {
              program_id,
              cost_component_id: { [Op.in]: mappingsToRemove }
            },
            transaction
          }
        );
      }

      if (mappingsToAdd.length > 0) {
        const newMappings = mappingsToAdd.map((id: any) => ({
          program_id,
          cost_component_id: id,
        }));
        await CostComponentMapping.bulkCreate(newMappings, { transaction });
      }
    }
    await transaction.commit();
    reply.send({ success: true, message: 'Group and Mappings Updated Successfully.' });
  } catch (error) {
    await transaction.rollback();
    reply.status(500).send({ message: 'An Error Occurred While Updating The Group', error, trace_id: generateCustomUUID() });
  }
}

export const deleteCostComponentGroup = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const data = await CostComponentGroup.findOne({
      where: { id, program_id, is_deleted: false },
    });

    if (!data) {
      return reply.status(200).send({ message: 'Group Data Not Found' });
    }
    await data.update({ is_enabled: false, is_deleted: true });
    reply.status(200).send({
      status_code: 200,
      cost_component_group_id: id,
      trace_id: generateCustomUUID(),
      message: 'Group Deleted Successfully'
    });
  } catch (error) {
    reply.status(500).send({ message: 'Error Deleting Group Data', error, trace_id: generateCustomUUID() });
  }
}

export async function getAllCostComponentGroups(
  request: FastifyRequest<{ Params: CostComponentGroupData, Querystring: CostComponentGroupData }>,
  reply: FastifyReply
) {
  try {
    const params = request.params as CostComponentGroupData;
    const query: any = request.query as CostComponentGroupData;

    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;

    const searchConditions: any = {};
    if (query.name) {
      searchConditions.name = { [Op.like]: `%${query.name}%` };
    }
    if (query.is_enabled) {
      searchConditions.is_enabled = query.is_enabled;
    }
    const { rows: costComponentGroups, count } = await CostComponentGroup.findAndCountAll({
      where: { ...query, ...searchConditions, is_deleted: false, program_id: params.program_id },
      attributes: { exclude: ["program_id"] },
      limit: limit,
      order: [["created_on", "DESC"]],
      offset: offset,
    });
    if (costComponentGroups.length === 0) {
      return reply.status(200).send({
        message: "Cost Component Not Found",
        cost_component_groups: []
      });
    }
    reply.status(200).send({
      statusCode: 200,
      items_per_page: limit,
      total_records: count,
      cost_component_groups: costComponentGroups,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: "Internal Server Error",
      error: error,
      trace_id: generateCustomUUID(),
    });
  }
}

export async function getCostComponentGroupById(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const item = await CostComponentGroup.findOne({
      where: { id, program_id }
    });
    if (item) {
      reply.status(200).send({
        statusCode: 200,
        cost_componet_group: item,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({ message: 'Group Data Not Found', cost_component_group: [] });
    }
  } catch (error) {
    reply.status(500).send({ message: 'An Error Occurred While Fetching Group Data', error });
  }
}
