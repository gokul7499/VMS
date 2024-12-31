import { FastifyRequest, FastifyReply } from 'fastify';
import IndustriesModel from '../models/labour-categories.model';
import { IndustriesInterface, } from '../interfaces/labour-categories.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op } from 'sequelize';

export async function createIndustries(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const labour_categories = request.body as IndustriesInterface;
  const { name, program_id } = request.body as { name: string, program_id: string };
  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({status_code:401, message: 'Unauthorized - Token not found' });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
  }

  logger(
    {
      trace_id:traceId,
      actor: {
        user_name: user?.preferred_username,
        user_id: user?.sub,
      },
      data: request.body,
      eventname: "creating labour categories",
      status: "success",
      description: `Creating labour categories for ${program_id}`,
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
        trace_id:traceId,
      });
    }

    const item = await IndustriesModel.create({ ...labour_categories });
    reply.status(201).send({
      status_code: 201,
      message:"Industries create successfully",
      data: item.id,
      trace_id:traceId,
    });

    logger(
      {
        trace_id:traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creat labour categories",
        status: "success",
        description: `Creat labour categories for ${program_id} successfully: ${item.id}`,
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
        trace_id:traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create labour categories",
        status: "error",
        description: `error to create labour categories for ${program_id}`,
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
      trace_id:traceId,
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

    const { rows: labour_categories, count } = await IndustriesModel.findAndCountAll({
      where: whereCondition,
      attributes: ['id', 'name', 'is_enabled', 'created_on', 'modified_on'],
      limit: pageSize,
      offset,
      order:[['modified_on','DESC']]
    });

    if (labour_categories.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'No labour categories found',
        labour_categories: [],
      });
    }

    reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: 'labour categories retrieved successfully',
      items_per_page: pageSize,
      current_page: pageNumber,
      total_records: count,
      labour_categories
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
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
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const item = await IndustriesModel.findOne({
      where: { id, program_id, is_deleted: false },
      attributes: ['id', 'name', 'is_enabled', 'created_on', 'modified_on'],
    });
    if (item) {
      reply.status(200).send({
        status_code: 200,
        message:"Industries get sueccssfully",
        labour_category_data: item,
        trace_id:traceId
      });
    } else {
      reply.status(200).send({
        status_code:200,
        message: 'labour category not found',
        labour_category: [],
        trace_id:traceId
      });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'An error occurred while fetching',
      trace_id:traceId
    });
  }
}

export async function updateIndustries(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const labour_categories = request.body as IndustriesInterface;
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
        trace_id:traceId,
      });
    }

    const [numRowsUpdated] = await IndustriesModel.update(
      { ...labour_categories, modified_on: Date.now() },
      { where: { id, program_id } }
    );

    if (numRowsUpdated > 0) {
      reply.status(200).send({
        status_code: 200,
        message:"Industries get successfully",
        labour_category_id: id,
        trace_id:traceId,
      });
    } else {
      reply.status(404).send({ status_code:401,message: 'labour categories not found' });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while updating',
      trace_id:traceId
    });
  }
}

export async function deleteIndustries(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
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
        message:"Industries delete successfully",
        labour_category_id: id,
        trace_id:traceId,
      });
    } else {
      reply.status(404).send({ status_code:404,message: 'labour categories not found' });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'An error occurred while deleting',
      trace_id:traceId
    });
  }
}

export const bulkUploadIndustries = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const labour_categories = request.body as any[];
    const createdLabourCategories = await IndustriesModel.bulkCreate(labour_categories);
    reply.status(201).send({
      status_code: 201,
      data: createdLabourCategories,
      message: 'labour categories Created successfully',
      trace_id:traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create labour categories',
      trace_id:traceId,
      error: error,
    });
  }
};