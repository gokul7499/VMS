import { FastifyRequest, FastifyReply } from "fastify";
import CostComponentModel from "../models/costcomponentModel";
import { costcomponentData } from "../interfaces/costcomponentInterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export async function createCostcomponent(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { name, code } = request.body as costcomponentData;
  const trace_id = generateCustomUUID();

  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }
  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
  }

  try {
    const existingCostComponentWithSameName = await CostComponentModel.findOne({
      where: { name, program_id },
    });

    if (existingCostComponentWithSameName) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: request.body,
          eventname: "create cost component",
          status: "error",
          description: `Error creating cost component for ${program_id}: Name already exists`,
          level: 'error',
          action: request.method,
          url: request.url,
          entity_id: program_id,
          is_deleted: false
        },
        CostComponentModel
      );

      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
        trace_id,
      });
    }

    const existingCostComponentWithSameCode = await CostComponentModel.findOne({
      where: { code, program_id },
    });

    if (existingCostComponentWithSameCode) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: request.body,
          eventname: "create cost component",
          status: "error",
          description: `Error creating cost component for ${program_id}: Code already exists`,
          level: 'error',
          action: request.method,
          url: request.url,
          entity_id: program_id,
          is_deleted: false
        },
        CostComponentModel
      );

      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Code Field, Code Must Be Unique.",
        trace_id,
      });
    }

    const costcomponent = request.body as costcomponentData;
    const item: any = await CostComponentModel.create({ ...costcomponent, program_id });

    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create cost component",
        status: "success",
        description: `Cost component created for ${program_id}: ${item.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      CostComponentModel
    );

    reply.status(201).send({
      statusCode: 201,
      cost_component_id: item?.id,
      trace_id,
    });
  } catch (error: any) {
    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create cost component",
        status: "error",
        description: `Error creating cost component for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      CostComponentModel
    );

    reply.status(500).send({
      message: 'Internal Server Error',
      error,
      trace_id,
    });
  }
}

export async function getCostcomponent(
  request: FastifyRequest<{ Params: costcomponentData, Querystring: costcomponentData }>,
  reply: FastifyReply
) {
  try {
    const params = request.params;
    const query = request.query;

    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;

    const searchConditions: any = {};
    if (query.name) {
      searchConditions.name = { [Op.like]: `%${query.name}%` };
    }
    if (query.is_enabled !== undefined) {
      searchConditions.is_enabled = query.is_enabled;
    }
    if (query.code) {
      searchConditions.code = { [Op.like]: `%${query.code}%` };
    }
    const { rows: costcomponent, count } = await CostComponentModel.findAndCountAll({
      where: { ...query, ...searchConditions, is_deleted: false, program_id: params.program_id },
      attributes: { exclude: ["ref_id", "program_id"] },
      limit: limit,
      order: [["created_on", "DESC"]],
      offset: offset,
    });
    if (costcomponent.length === 0) {
      return reply.status(200).send({
        message: "Cost Component Not Found",
        cost_component: []
      });
    }
    reply.status(200).send({
      statusCode: 200,
      items_per_page: limit,
      total_records: count,
      cost_component: costcomponent,
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

export async function getCostcomponentById(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const item = await CostComponentModel.findOne({
      where: { id, program_id },
      attributes: { exclude: ["ref_id", "program_id"] },
    });
    if (item) {
      reply.status(201).send({
        statusCode: 201,
        cost_component: item,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        message: "Cost Component Not Found",
        cost_component: []
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: "Internal Server Error",
      error,
      trace_id: generateCustomUUID(),
    });
  }
}

export async function updateCostcomponent(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const costcomponent = request.body as costcomponentData;
    const { name, code } = request.body as costcomponentData;

    const existingCostComponentWithSameName = await CostComponentModel.findOne({
      where: {
        name,
        program_id,
        id: { [Op.ne]: id },
      },
    });

    if (existingCostComponentWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
        trace_id: generateCustomUUID(),
      });
    }

    const existingCostComponentWithSameCode = await CostComponentModel.findOne({
      where: {
        code,
        program_id,
        id: { [Op.ne]: id },
      },
    });

    if (existingCostComponentWithSameCode) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Code Field, Code Must Be Unique.",
        trace_id: generateCustomUUID(),
      });
    }
    const [numRowsUpdated] = await CostComponentModel.update(
      { ...costcomponent, modified_on: Date.now() },
      { where: { id, program_id, is_deleted: false } }
    );

    if (numRowsUpdated > 0) {
      reply.status(201).send({
        statusCode: 201,
        message: "Cost Component Updated Successfully",
        cost_component_id: id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        message: "Cost Component Not Found",
        cost_component: []
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: "Internal Server Error",
      error,
      trace_id: generateCustomUUID(),
    });
  }
}

export async function deleteCostcomponent(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const [numRowsDeleted] = await CostComponentModel.update({
      is_deleted: true, is_enabled: false
    },
      { where: { id, program_id, is_deleted: false } }
    );

    if (numRowsDeleted > 0) {
      reply.status(204).send({
        statusCode: 204,
        cost_component_id: id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        message: "Cost Component Not Found",
        cost_component: []
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: "Internal Server Error",
      error,
      trace_id: generateCustomUUID(),
    });
  }
}
