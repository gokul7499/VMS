import { rateType } from "../models/rateTypeModel";
import { FastifyRequest, FastifyReply } from "fastify";
import { CreateRateTypeData } from "../interfaces/rateTypeInterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes } from "sequelize";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import { getAllRateTypes } from "../utility/queries";

export const saveRateType = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = request.body as CreateRateTypeData;
  const { program_id } = request.params as { program_id: string };
  const { name, rate } = request.body as CreateRateTypeData;
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

    if (rate?.base_differential_on) {
      const existingRateTypeWithSameBaseDifferential = await rateType.findOne({
        where: {
          rate_type_category: data.rate_type_category,
          'rate.base_differential_on': rate.base_differential_on,
          program_id,
        },
      });

      if (existingRateTypeWithSameBaseDifferential) {
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
            description: `Rate type with the same base_differential_on already exists for program ${program_id}`,
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
          message: "A rate type with the same base differential already exists.",
          trace_id,
        });
      }
    }

    const item: any = await rateType.create({
      ...data,
      program_id,
      created_by: user.sub,
      modified_by: user.sub
    });

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
      message: "Rate Type created successfully.",
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
  request: FastifyRequest<{ Querystring: { id?: string; name?: string; is_enabled?: boolean | string; modified_on?: string; is_shift_rate?: boolean | string; is_base_rate?: string | boolean; page?: string; limit?: string } }>,
  reply: FastifyReply
) {
  const { program_id } = request.params as CreateRateTypeData;
  const { id, name, is_enabled, modified_on, is_shift_rate, is_base_rate, page = "1", limit = "10" } = request.query;
  const traceId = generateCustomUUID();

  try {
    const hasName = !!name;
    const hasId = !!id;
    const isEnabledValue =
      typeof is_enabled === "string" ? (is_enabled === "true" ? 1 : 0) : (is_enabled === true ? 1 : is_enabled === false ? 0 : undefined);

    const isShiftRateValue =
      typeof is_shift_rate === "string" ? (is_shift_rate === "true" ? 1 : 0) : (is_shift_rate === true ? 1 : is_shift_rate === false ? 0 : undefined);

    const isBaseRate =
      typeof is_base_rate === "string" ? (is_base_rate === "true" ? 1 : 0) : (is_base_rate === true ? 1 : is_base_rate === false ? 0 : undefined);

    let startDate;
    let endDate;

    if (modified_on) {
      const dateRange = modified_on.split(',');
      if (dateRange.length === 2) {
        startDate = parseInt(dateRange[0], 10);
        endDate = parseInt(dateRange[1], 10);
      }
    }

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const offset = (pageNumber - 1) * pageSize;

    const rateType = await sequelize.query<{ total_records: any }>(getAllRateTypes(hasName, hasId, !!is_enabled, !!is_shift_rate, !!is_base_rate, startDate, endDate, pageSize, offset), {
      replacements: {
        program_id,
        ...(hasId && { id }),
        ...(hasName && { name: `%${name}%` }),
        ...(isEnabledValue !== undefined && { is_enabled: isEnabledValue }),
        ...(isShiftRateValue !== undefined && { is_shift_rate: isShiftRateValue }),
        ...(isBaseRate !== undefined && { is_base_rate: isBaseRate }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        limit: pageSize,
        offset: offset,
      },
      type: QueryTypes.SELECT,
    });

    if (rateType.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No rate type found for the given program",
        total_records: 0,
        page: pageNumber,
        limit: pageSize,
        rate_types: [],
      });
    }

    const totalRecords = rateType[0]?.total_records || 0;
    const rateTypes = rateType.map(({ total_records, ...rest }) => rest);

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Rate type fetched successfully.",
      total_records: totalRecords,
      page: pageNumber,
      limit: pageSize,
      rate_types: rateTypes,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal server error",
      error: error.message,
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
  const updates = request.body as CreateRateTypeData;
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

export async function getDifferentialOnForRateType(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { is_shift_rate } = request.query as { is_shift_rate?: string };
  const traceId = generateCustomUUID();
  try {
    const whereConditions: any = {
      program_id,
      is_deleted: false,
    };

    const rateTypes = await rateType.findAll({
      where: whereConditions,
      attributes: ["id", "name", "is_base_rate", "is_shift_rate"],
    });

    let standard = null;
    const shift: { id: string; name: string }[] = [];

    rateTypes.forEach((rate: any) => {
      if (rate.is_base_rate && !rate.is_shift_rate) {
        standard = {
          id: rate.id,
          name: rate.name,
        };
      } else if (rate.is_base_rate && rate.is_shift_rate) {
        shift.push({
          id: rate.id,
          name: rate.name,
        });
      }
    });

    if (is_shift_rate === "false") {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        differential_on: {
          standard
        },
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      differential_on: {
        standard,
        shift,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to retrieve rate type",
      error: error.message,
    });
  }
}

