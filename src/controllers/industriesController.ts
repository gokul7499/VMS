import { FastifyRequest, FastifyReply } from 'fastify';
import IndustriesModel from '../models/industriesModel';
import { IndustriesInterface, } from '../interfaces/industriesInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op } from 'sequelize';

export async function createIndustries(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const industries = request.body as IndustriesInterface;
  const { name, program_id } = request.body as { name: string, program_id: string };
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
      eventname: "creating industries",
      status: "success",
      description: `Creating industries for ${program_id}`,
      level: 'info',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    },
    IndustriesModel
  );

  try {
    const existingIndustryWithSameName = await IndustriesModel.findOne({
      where: {
        name,
        program_id
      },
    });

    if (existingIndustryWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
        trace_id,
      });
    }

    const item = await IndustriesModel.create({ ...industries });
    reply.status(201).send({
      statusCode: 201,
      data: item.id,
      trace_id
    });

    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creat industries",
        status: "success",
        description: `Creat industries for ${program_id} successfully: ${item.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      IndustriesModel
    );
  } catch (error: any) {
    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creat industries",
        status: "error",
        description: `error to creat industries for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      IndustriesModel
    );

    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id
    });
  }
}

export const getIndustries = async (
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: { name?: string; is_enabled?: boolean | string; modified_on?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
) => {
  const { program_id } = request.params;
  const { name, is_enabled, modified_on, page = '1', limit = '10' } = request.query;
  const traceId = generateCustomUUID();

  try {
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const offset = (pageNumber - 1) * pageSize;

    const whereCondition: any = { is_deleted: false, program_id };

    if (name) {
      whereCondition.name = { [Op.like]: `%${name}%` };
    }
    if (is_enabled !== undefined) {
      whereCondition.is_enabled = is_enabled === 'true' || is_enabled === true;
    }
    if (modified_on) {
      const dateRange = modified_on.split(',');
      if (dateRange.length === 2) {
        const startDate = parseFloat(dateRange[0].trim());
        const endDate = parseFloat(dateRange[1].trim());
        whereCondition.modified_on = { [Op.between]: [startDate, endDate] };
      }
    }

    const { rows: industries, count } = await IndustriesModel.findAndCountAll({
      where: whereCondition,
      attributes: ['id', 'name', 'is_enabled', 'created_on', 'modified_on'],
      limit: pageSize,
      offset,
    });

    if (industries.length === 0) {
      return reply.status(200).send({
        statusCode: 200,
        trace_id: traceId,
        message: 'No industries found',
        industries: [],
      });
    }

    reply.status(200).send({
      statusCode: 200,
      trace_id: traceId,
      message: 'Industries retrieved successfully',
      items_per_page: pageSize,
      current_page: pageNumber,
      total_records: count,
      industries
    });
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error
    });
  }
};

export async function getIndustriesById(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const trace_id = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const item = await IndustriesModel.findOne({
      where: { id, program_id, is_deleted: false },
      attributes: ['id', 'name', 'is_enabled', 'created_on', 'modified_on'],
    });
    if (item) {
      reply.status(200).send({
        statusCode: 200,
        industry_data: item,
        trace_id
      });
    } else {
      reply.status(200).send({
        message: 'Industries not found',
        industry: [],
        trace_id
      });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'An error occurred while fetching',
      trace_id
    });
  }
}

export async function updateIndustries(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const trace_id = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const industries = request.body as IndustriesInterface;
    const { name, program_id } = request.body as { name: string, program_id: string };

    const existingIndustryWithSameName = await IndustriesModel.findOne({
      where: {
        name,
        program_id,
        id: { [Op.ne]: id },
      },
    });

    if (existingIndustryWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
        trace_id,
      });
    }

    const [numRowsUpdated] = await IndustriesModel.update(
      { ...industries, modified_on: Date.now() },
      { where: { id, program_id } }
    );

    if (numRowsUpdated > 0) {
      reply.status(200).send({
        statusCode: 200,
        industry_id: id,
        trace_id,
      });
    } else {
      reply.status(404).send({ message: 'Industries not found' });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'An error occurred while updating',
      trace_id
    });
  }
}

export async function deleteIndustries(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const trace_id = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const [numRowsDeleted] = await IndustriesModel.update({
      is_deleted: true,
      is_enabled: false,
      modified_on: Date.now(),
    },
      { where: { id, program_id } }
    );

    if (numRowsDeleted > 0) {
      reply.status(200).send({
        statusCode: 200,
        industry_id: id,
        trace_id,
      });
    } else {
      reply.status(404).send({ message: 'Industries not found' });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'An error occurred while deleting',
      trace_id
    });
  }
}

export const bulkUploadIndustries = async (request: FastifyRequest, reply: FastifyReply) => {
  const trace_id = generateCustomUUID();
  try {
    const Industries = request.body as any[];
    const createdIndustries = await IndustriesModel.bulkCreate(Industries);
    reply.status(201).send({
      status_code: 201,
      data: createdIndustries,
      message: 'Industries Created successfully',
      trace_id,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create Industries',
      trace_id,
      error: error,
    });
  }
};