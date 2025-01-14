import { Programs } from "../models/programs.model";
import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateProgramData,
  ProgramQuery,
} from "../interfaces/programs.interface";
import Tenant from "../models/tenant.model";
import { baseSearch } from "../utility/baseService";
import { Op } from "sequelize";
import generateCustomUUID from "../utility/genrateTraceId";
import ProgramConfig from "../models/programs-config.model";
import Configuration from "../models/configuration.model";
import ProgramModule from "../models/program-module.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";

export const saveProgram = async (request: FastifyRequest, reply: FastifyReply) => {
  const { ...programData } = request.body as CreateProgramData;
  const traceId = generateCustomUUID();

  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found', trace_id: traceId });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token', trace_id: traceId });
  }

  logger(
    {
      trace_id: traceId,
      actor: {
        user_name: user?.preferred_username,
        user_id: user?.sub,
      },
      data: request.body,
      eventname: "authenticated",
      status: "success",
      description: `Authenticated user ${user?.preferred_username}`,
      level: 'info',
      action: request.method,
      url: request.url,
      is_deleted: false
    },
    Programs
  );

  const transaction = await sequelize.transaction();

  try {
    const item: any = await Programs.create({ ...programData }, { transaction });

    reply.status(201).send({
      status_code: 201,
      id: item.id,
      message: "Program Created Successfully",
      trace_id: traceId,
    });

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating program",
        status: "success",
        description: `Creating program for ${item.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        is_deleted: false
      },
      Programs
    );

    process.nextTick(async () => {
      try {
        const defaultConfigs = await Configuration.findAll({ transaction });

        const programConfigs = defaultConfigs.map((config) => {
          const { id, created_by, modified_by, created_on, modified_on, ...configWithoutId } = config.toJSON();
          return {
            program_id: item.id,
            created_by: user.sub,
            modified_by: user.sub,
            configuration_id: id,
            ...configWithoutId,
          };
        });

        await ProgramConfig.bulkCreate(programConfigs, { transaction });

        await transaction.commit();
      } catch (error) {

        logger(
          {
            trace_id: traceId,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: request.body,
            eventname: "configuring program",
            status: "error",
            description: `Error configuring program for ${item.id}`,
            level: 'error',
            action: request.method,
            url: request.url,
            is_deleted: false
          },
          Programs
        );

        await transaction.rollback();
        console.error("Error in async configuration setup:", error);
      }
    });
  } catch (error: any) {

    await transaction.rollback();

    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error,
    });

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating program",
        status: "error",
        description: `Error creating program for ${programData.name}`,
        level: 'error',
        action: request.method,
        url: request.url,
        is_deleted: false
      },
      Programs
    );
  }
};

export const getAllProgram = async (request: FastifyRequest<{ Querystring: ProgramQuery }>, reply: FastifyReply) => {
  const { name, is_activated, start_date } = request.query as Partial<ProgramQuery>;
  const traceId = generateCustomUUID();
  try {
    const query = request.query as any;
    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;

    const programs = await Programs.findAll({
      where: {
        is_deleted: false,
        ...(name && { name: { [Op.like]: `%${name}%` } }),
        ...(is_activated !== undefined && {
          is_activated: is_activated === "true" ? 1 : 0,
        }),
        ...(start_date && { start_date: { [Op.gte]: new Date(start_date) } }),
      },
      include: [
        {
          model: Tenant,
          as: "client",
          where: {
            is_deleted: false,
          },
          attributes: ["name", "display_name", "id", "logo"],
        },
      ],
      attributes: ["id", "name", "display_name", "is_enabled", "unique_id"],
      order: [['created_on', 'DESC']],
      limit: limit,
      offset: offset,
    });

    const count = await Programs.count({
      where: {
        is_deleted: false,
        ...(name && { name: { [Op.like]: `%${name}%` } }),
        ...(is_activated !== undefined && {
          is_activated: is_activated === "true" ? 1 : 0,
        }),
        ...(start_date && { start_date: { [Op.gte]: new Date(start_date) } }),
      },
    });
    if (programs.length === 0) {
      return reply.status(200).send({ status_code: 200, message: "Programs not found", programs: [], trace_id: traceId });
    }
    reply.status(200).send({
      status_code: 200,
      message: "Programs found",
      items_per_page: limit,
      total_records: count,
      programs: programs,
      trace_id: traceId,
    });
  } catch (error) {
    console.error('Error in getAllProgram:', error);
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server error",
      trace_id: traceId,
    });
  }
};

export const getProgramById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const traceId = generateCustomUUID();
  try {
    const programs = await Programs.findOne({
      where: {
        id: id,
        is_deleted: false,
      },
      include: [
        {
          model: Tenant,
          as: "client",
          where: {
            is_deleted: false,
          },
          attributes: ["name", "display_name", "id", "logo"],
        },
        {
          model: Tenant,
          as: "msp",
          required: false,
          where: {
            is_deleted: false,
          },
          attributes: ["name", "display_name", "id", "logo"],
        },
      ],
      attributes: [
        "id",
        "name",
        "display_name",
        "description",
        "type",
        "start_date",
        "is_enabled",
        "unique_id",
      ],
    });
    if (programs) {
      reply.status(200).send({
        status_code: 200,
        message: "Data fetch successfully",
        data: programs,
        trace_id: traceId,
        program: [],
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Programs not found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server error",
      trace_id: traceId,
      error: error,
    });
  }
};

export const updateProgramById = async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<CreateProgramData>; }>, reply: FastifyReply) => {
  const { id } = request.params;
  const updates = request.body as CreateProgramData;
  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;

  try {
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;

    const program = await Programs.findOne({
      where: {
        id: id,
        is_deleted: false,

      },
    });
    if (!program) {
      return reply.status(200).send({
        status_code: 200,
        message: "Program not found",
        trace_id: traceId,
      });
    }
    if (updates.module_groups != null && updates.module_groups.length > 0) {
      let modules = {
        modules: updates.module_groups,
      };
      await ProgramModule.update(modules, {
        where: { program_id: id }
      });
    }

    const updatedCount: any = await Programs.update({...updates, modified_by:userId}, {
      where: { id: id },
    });
    reply.status(200).send({
      status_code: 200,
      id: updatedCount.id,
      message: "Program configuration updated successfully",
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error,
    });
  }
};

export async function deleteProgramById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;
  try {
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
    const program = await Programs.findByPk(id);
    if (program) {
      await program.update({
        is_enabled: false,
        is_deleted: true,
        modified_by: userId,
      });
      reply.status(204).send({
        status_code: 204,
        message: "Program Deleted Successfully",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Program Not Found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error,
    });
  }
};

export async function advancedFilter(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ["is_enabled", "name"];
  const responseFields = ["id", "name", "display_name", "type", "is_enabled"];
  return baseSearch(request, reply, Programs, searchFields, responseFields);
}