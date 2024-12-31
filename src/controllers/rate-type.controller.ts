import rateType from "../models/rate-type.model";
import { FastifyRequest, FastifyReply } from "fastify";
import { CreateRateTypeData } from "../interfaces/rate-type-interface";
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
  const traceId = generateCustomUUID();

  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({status_code:401, message: 'Unauthorized - Token not found' ,trace_id:traceId});
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({status_code:401, message: 'Unauthorized - Invalid token' ,trace_id:traceId});
  }

  logger(
    {
      trace_id:traceId,
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
          trace_id:traceId,
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
        trace_id:traceId,
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
            traceId,
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
          traceId,
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
        trace_id:traceId,
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
      traceId,
    });
  } catch (error: any) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0].path;
      return reply.status(400).send({status_code:400, trace_id: traceId, message: `${field} already in use!` });
    }
    logger(
      {
        trace_id:traceId,
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
      trace_id:traceId,
      error: error
    });
  }
};

export async function getAllRateType(request: FastifyRequest<{
  Querystring: {
    id?: string;
    name?: string;
    is_enabled?: boolean | string;
    modified_on?: string;
    is_shift_rate?: boolean | string;
    is_base_rate?: string | boolean;
    differential_on?: string;
    rate_type_category?: string;
    shift_type?: string;
    page?: string;
    limit?: string;
  };
}>,
  reply: FastifyReply
) {
  const { program_id } = request.params as { program_id: string };
  const { id, name, is_enabled, modified_on, is_shift_rate, is_base_rate, differential_on, rate_type_category, shift_type, page = "1", limit = "10" } = request.query;
  const traceId = generateCustomUUID();

  try {
    const queryParams = getQueryParams({ id, name, is_enabled, modified_on, is_shift_rate, is_base_rate, differential_on, rate_type_category, shift_type, page, limit });
    const rateType = await fetchRateTypes(queryParams, program_id);

    if (rateType.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No rate type found for the given program",
        total_records: 0,
        page: queryParams.pageNumber,
        limit: queryParams.pageSize,
        rate_type: [],
      });
    }

    const totalRecords = rateType[0]?.total_records || 0;
    const rateTypes = rateType.map(({ total_records, ...rest }) => rest);

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Rate type fetched successfully.",
      total_records: totalRecords,
      page: queryParams.pageNumber,
      limit: queryParams.pageSize,
      rate_type: rateTypes,
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

function getQueryParams(query: any) {
  const { id, name, is_enabled, modified_on, is_shift_rate, is_base_rate, differential_on, rate_type_category, shift_type, page = "1", limit = "10" } = query;

  const hasName = !!name;
  const hasId = !!id;
  const hasDifferentialOn = !!differential_on;
  const hasRateTypeCategory = !!rate_type_category;
  const hasShiftType = !!shift_type;
  const isEnabledValue = parseBoolean(is_enabled);
  const isShiftRateValue = parseBoolean(is_shift_rate);
  const isBaseRate = parseBoolean(is_base_rate);

  const { startDate, endDate } = parseDateRange(modified_on);

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const offset = (pageNumber - 1) * pageSize;

  return { id, name, differential_on, rate_type_category, shift_type, hasName, hasId, isEnabledValue, isShiftRateValue, isBaseRate, hasDifferentialOn, hasRateTypeCategory, hasShiftType, startDate, endDate, pageNumber, pageSize, offset };
}

function parseBoolean(value: any): number | undefined {
  if (typeof value === "string") {
    return value === "true" ? 1 : 0;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return undefined;
}

function parseDateRange(dateRange: string): { startDate?: number, endDate?: number } {
  if (!dateRange) return {};
  const dates = dateRange.split(",");
  if (dates.length === 2) {
    return {
      startDate: parseInt(dates[0], 10),
      endDate: parseInt(dates[1], 10),
    };
  }
  return {};
}

async function fetchRateTypes(queryParams: any, program_id: string) {
  return await sequelize.query<{ total_records: any }>(
    getAllRateTypes(queryParams.hasName, queryParams.hasId, !!queryParams.isEnabledValue, !!queryParams.isShiftRateValue, !!queryParams.isBaseRate, queryParams.hasDifferentialOn, queryParams.hasRateTypeCategory, queryParams.hasShiftType, queryParams.startDate, queryParams.endDate, queryParams.pageSize, queryParams.offset),
    {
      replacements: {
        program_id,
        ...(queryParams.hasName && { name: `%${queryParams.name}%` }),
        ...(queryParams.hasId && { id: queryParams.id }),
        ...(queryParams.isEnabledValue !== undefined && { is_enabled: queryParams.isEnabledValue }),
        ...(queryParams.isShiftRateValue !== undefined && { is_shift_rate: queryParams.isShiftRateValue }),
        ...(queryParams.isBaseRate !== undefined && { is_base_rate: queryParams.isBaseRate }),
        ...(queryParams.hasDifferentialOn && { differential_on: `%${queryParams.differential_on}%` }),
        ...(queryParams.hasRateTypeCategory && { rate_type_category: `%${queryParams.rate_type_category}%` }),
        ...(queryParams.hasShiftType && { shift_type: `%${queryParams.shift_type}%` }),
        ...(queryParams.startDate !== undefined && { startDate: queryParams.startDate }),
        ...(queryParams.endDate !== undefined && { endDate: queryParams.endDate }),
        limit: queryParams.pageSize,
        offset: queryParams.offset,
      },
      type: QueryTypes.SELECT,
    }
  );
}

export async function getRateTypeById(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as {
    id: string;
    program_id: string;
  };

  if (!id || !program_id) {
    return reply.status(400).send({
      status_code: 400,
      trace_id: generateCustomUUID(),
      message: "Invalid parameters"
    });
  }
  const traceId = generateCustomUUID();
  try {
    const rateTypeRecord = await rateType.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      }
    });

    if (!rateTypeRecord) {
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message: "Rate type not found"
      });
    }

    const [rateTypeCategory] = await sequelize.query(`SELECT id, label, value FROM picklistitems WHERE id = :rateTypeCategoryId;`, {
      replacements: { rateTypeCategoryId: rateTypeRecord.rate_type_category }
    });

    const [shiftType] = await sequelize.query(`SELECT id, shift_type_name FROM shift_types WHERE id = :shiftTypeId;`, {
      replacements: { shiftTypeId: rateTypeRecord.shift_type }
    });

    rateTypeRecord.rate_type_category = rateTypeCategory.length > 0 ? rateTypeCategory[0] : null;
    rateTypeRecord.shift_type = shiftType.length > 0 ? shiftType[0] : null;

    return reply.status(200).send({
      status_code: 200,
      rate_type: rateTypeRecord,
      trace_id: traceId,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to retrieve rate type",
      error: error.message
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
