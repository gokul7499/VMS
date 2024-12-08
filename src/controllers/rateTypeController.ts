import { rateType } from "../models/rateTypeModel";
import { FastifyRequest, FastifyReply } from "fastify";
import { CreateRateTypeData } from "../interfaces/rateTypeInterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const saveRateType = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = request.body as CreateRateTypeData;
  const { program_id } = request.params as { program_id: string };
  const { name } = request.body as CreateRateTypeData;
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
  logger(
    {
      trace_id,
      actor: {
        user_name: user?.preferred_username,
        user_id: user?.sub,
      },
      data: request.body,
      eventname: "Creating rate type config",
      status: "success",
      description: `Creating rate type for ${program_id}`,
      level: 'info',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    },
    rateType
  );
  try {
    const existingRateTypeWithSameName = await rateType.findOne({
      where: { name, program_id },
    });

    if (existingRateTypeWithSameName) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: request.body,
          eventname: "creating rate type",
          status: "error",
          description: `Rate type with name ${name} already exists for program ${program_id}`,
          level: 'error',
          action: request.method,
          url: request.url,
          entity_id: program_id,
          is_deleted: false
        },
        rateType
      );

      return reply.status(400).send({
        status_code: 400,
        message: "A rate type with this name already exists.",
        trace_id,
      });
    }

    const item: any = await rateType.create({ ...data, program_id });

    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating rate type",
        status: "success",
        description: `Rate type created successfully for program ${program_id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      rateType
    );

    reply.status(201).send({
      status_code: 201,
      id: item.id,
      message: "Data created successfully",
      trace_id,
    });
  } catch (error: any) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0].path;
      return reply.status(400).send({ trace_id: trace_id, message: `${field} already in use!` });
    }
    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating rate type",
        status: "error",
        description: `Error creating rate type for program ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      rateType
    );

    reply.status(500).send({
      status_code: 500,
      message: "Internal server error",
      trace_id,
      error: error
    });
  }
};

export async function getAllRateType(
  request: FastifyRequest<{ Querystring: CreateRateTypeData }>,
  reply: FastifyReply
) {
  try {
    const params = request.params as CreateRateTypeData;
    const query: any = request.query;

    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;

    const searchConditions: any = { program_id: params.program_id, is_deleted: false };
    if (query.is_enabled) {
      searchConditions.is_enabled = query.is_enabled === "false" ? false : true;
    }

    if (query.is_shift_rate) {
      searchConditions.is_shift_rate = query.is_shift_rate === "false" ? false : true;
    }

    if (query.start_date && query.end_date) {
      searchConditions.modified_on = {
        [Op.between]: [query.start_date, query.end_date],
      };
    } else if (query.start_date) {
      searchConditions.modified_on = {
        [Op.gte]: query.start_date,
      };
    } else if (query.end_date) {
      searchConditions.modified_on = {
        [Op.lte]: query.end_date,
      };
    }
    if (query.name) {
      searchConditions.name = { [Op.like]: `%${query.name}%` };
    }
    if (query.shift_category) {
      searchConditions.shift_category = { [Op.like]: `%${query.shift_category}%` };
    }
    if (query.type) {
      searchConditions.type = { [Op.like]: `%${query.type}%` };
    }

    let order: [string, string][] = [["modified_on", "DESC"]];
    if (query.sort === "1") {
      order = [["modified_on", "ASC"]];
    } else if (query.sort === "-1") {
      order = [["modified_on", "DESC"]];
    }

    const rateTypeResponse = await rateType.findAll({
      where: searchConditions,
      limit,
      offset,
      order,
      attributes: {
        exclude: ["is_deleted", "program_id", "ref_id"],
      },
    });

    const count = await rateType.count({ where: searchConditions });

    return reply.status(200).send({
      status_code: 200,
      items_per_page: limit,
      total_records: count,
      rate_type: rateTypeResponse,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal server error",
      error,
    });
  }
}

export async function getRateTypeById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id, program_id } = request.params as {
    id: string;
    program_id: string;
  };
  if (!id || !program_id) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Invalid parameters"
    });
  }
  try {
    const rateTypes = await rateType.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
      attributes: {
        exclude: ["is_deleted", "program_id", "ref_id"],
      }
    });
    if (rateTypes) {
      return reply.status(200).send({
        status_code: 200,
        rate_type: rateTypes,
        trace_id: generateCustomUUID(),
      });
    } else {
      return reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: "Rate type not found"
      });
    }
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Failed to retrieve rate type", error
    });
  }
}

export const updateRateTypeById = async (request: FastifyRequest<{ Params: { id: string }, Body: Partial<CreateRateTypeData> }>, reply: FastifyReply) => {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const updates = request.body as Partial<CreateRateTypeData>;
  const { name } = request.body as CreateRateTypeData;
  try {
    const existingRateTypeWithSameName = await rateType.findOne({
      where: {
        name,
        program_id,
        id: { [Op.ne]: id },
      },
    });

    if (existingRateTypeWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid name field, name must be unique.",
        trace_id: generateCustomUUID(),
      });
    }

    const rateTypes = await rateType.findOne({
      where: {
        id: id,
        is_deleted: false
      }
    });
    if (!rateTypes) {
      return reply.status(200).send({
        status_code: 200,
        message: "Rate Types not found",
        trace_id: generateCustomUUID(),
      });
    }
    const updatedCount: any = await rateType.update(updates, {
      where: { id: id }
    });
    reply.status(200).send({
      status_code: 200,
      id: updatedCount.id,
      message: "Rate type updated successfully",
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal server error",
      trace_id: generateCustomUUID(),
      error: error
    });
  }
};

export const deleteRateTypeById = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = request.params;
  try {
    const rateTypes = await rateType.findByPk(id);
    if (rateTypes) {
      await rateTypes.update({
        is_enabled: false,
        is_deleted: true,
      })
      reply.status(204).send({
        status_code: 204,
        message: "Rate type deleted successfully",
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Rate type not found",
        trace_id: generateCustomUUID(),
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal server error",
      trace_id: generateCustomUUID(),
      error: error
    });
  }
};

export async function getRateTBYId(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { program_id } = request.params as {
    program_id: string;
  };
  const { shift_category } = request.query as {
    shift_category?: string;
  };

  if (!program_id) {
    return reply.status(400).send({
      status_code: 400,
      trace_id: generateCustomUUID(),
      message: "program_id is required",
    });
  }

  if (shift_category !== undefined) {
    if (shift_category.trim() === "") {
      return reply.status(400).send({
        status_code: 400,
        trace_id: generateCustomUUID(),
        message: "Shift category has no value. Please provide a valid value.",
      });
    }
  }

  try {
    const whereConditions: any = {
      program_id,
      type: "standard",
      is_deleted: false,
    };

    if (shift_category) {
      whereConditions.shift_category = shift_category;
    }

    const rateTypes = await rateType.findAll({
      where: whereConditions,
      attributes: {
        exclude: ["is_deleted", "program_id", "ref_id"],
      },
    });

    if (rateTypes && rateTypes.length > 0) {
      return reply.status(200).send({
        status_code: 200,
        rate_type: rateTypes,
        trace_id: generateCustomUUID(),
      });
    } else {
      return reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: "Rate type not found",
        rate_type: []
      });
    }
  } catch (error) {
    console.error("Error retrieving rate type:", error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Failed to retrieve rate type",
      error,
    });
  }
}
