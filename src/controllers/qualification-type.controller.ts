import { FastifyRequest, FastifyReply } from 'fastify';
import qualificationTypeModel from '../models/qualification-type-model';
import Qualifications from '../models/qualifications.model';
import qualificationType from '../interfaces/qualification-type.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { sequelize } from '../config/instance';
import { decodeToken } from '../middlewares/verifyToken';
import QualificationValueMaster from '../models/qualification_value_master.model';

export async function getQualificationTypes(
  request: FastifyRequest<{ Params: qualificationType, Querystring: qualificationType }>,
  reply: FastifyReply
) {
  const traceId=generateCustomUUID();
  try {
    const params = request.params as Partial<qualificationType>;
    const query = request.query as any;

    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '10');
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;

    const searchConditions: any = {};

    if (query.type) {
      searchConditions.type = query.type;
    } else {
      if (query.name) {
        searchConditions.name = { [Op.like]: `%${query.name}%` };
      }
      if (query.is_enabled !== undefined) {
        searchConditions.is_enabled = query.is_enabled === "true" ? true : query.is_enabled === "false" ? false : null;
      }
      searchConditions.program_id = params.program_id;
    }

    const { rows: qualificationTypes, count } = await qualificationTypeModel.findAndCountAll({
      where: { ...searchConditions, is_deleted: false },
      attributes: ['id', 'name', 'code', 'description', 'is_enabled', 'created_on', 'created_by', 'type'],
      order: [['created_on', 'DESC']],
      limit: limit,
      offset: offset,
    });

    if (qualificationTypes.length === 0) {
      return reply.status(200).send({
        status_code:200,
        traceId: traceId,
        message: "Qualification type not found",
        qualificationTypes: []
      });
    }

    const qualificationCounts = await Promise.all(
      qualificationTypes.map(async (type) => {
        const count = await Qualifications.count({
          where: {
            qualification_type_id: type.id,
            is_deleted: false,
          },
        });
        return { qualification_type_id: type.id, count };
      })
    );

    const qualificationType = qualificationTypes.map(type => {
      const countData = qualificationCounts.find(count => count.qualification_type_id === type.id);
      return {
        ...type.toJSON(),
        qualifications_count: countData ? countData.count : 0
      };
    });

    reply.status(200).send({
      status_code: 200,
      message:" Qualification type get successfully",
      items_per_page: limit,
      total_records: count,
      qualification_type: qualificationType,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
    });
  }
}

export async function createQualificationTypes(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const traceId=generateCustomUUID();
  const authHeader = request.headers.authorization;
  
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
  
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
  
    if (!user) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
  try {
    const { name } = request.body as qualificationType;
    const existingQualificationType = await qualificationTypeModel.findOne({
      where: { name, program_id }
    });

    if (existingQualificationType) {
      return reply.status(409).send({
        status_code: 409,
        message: 'Qualification type with the same name already exists.',
        trace_id: traceId,
      });
    }

    const qualification_types = request.body as qualificationType;
    const qualificationType: any = await qualificationTypeModel.create({ ...qualification_types, program_id ,created_by: userId,modified_by: userId,});
    reply.status(201).send({
      status_code: 201,
      message: 'Qualification type created successfully',
      qualification_type: {
        id: qualificationType?.id,
        qualificationType_name: qualificationType?.qualificationType_name
      },
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating the qualification type',
      error,
      trace_id: traceId,
    })
  }
}

export const getQualificationTypeById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const traceId=generateCustomUUID();
  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program Id is required',
      trace_id: traceId,
    });
    return;
  }

  try {
    const qualificationTypeData = await qualificationTypeModel.findOne({
      where: { id, program_id },
      attributes: ['id', 'name', 'code', 'description', 'is_enabled', "type"],
    });

    if (qualificationTypeData) {
      reply.status(200).send({
        status_code: 200,
        message: 'Qualification type retrieved successfully',
        qualificationType: qualificationTypeData,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Qualification type not found',
        trace_id: traceId,
        qualificationType: []
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
};

export const updateQualificationTypes = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const updates = request.body as qualificationType;
  let { name } = request.body as qualificationType;
  const traceId=generateCustomUUID();
  name = name.trim();
  if (!program_id) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Program Id is required',
      trace_id: traceId,
    });
  }
  const authHeader = request.headers.authorization;
  
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
  
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
  
    if (!user) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
  try {
    const existingQualificationTypeWithSameName = await qualificationTypeModel.findOne({
      where: {
        name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', name)),
        id: { [Op.ne]: id },
        program_id,
        is_deleted: false,
      }
    });

    if (existingQualificationTypeWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Qualification type with same name already exists.",
        trace_id: traceId,
      });
    }
    const data = await qualificationTypeModel.findOne({
      where: { id, program_id, is_deleted: false },
    });

    if (!data) {
      return reply.status(404).send({
        status_code: 404,
        message: 'Qualification type not found.',
        trace_id: traceId,
      });
    }
    await data.update({updates,modified_by: userId,});

    return reply.status(200).send({
      status_code: 200,
      message: 'Qualification type updated successfully.',
      trace_id: traceId,
    });
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal server error: Failed to update qualification type',
      trace_id: traceId,
    });
  }
};

export async function deleteQualificationTypes(request: FastifyRequest, reply: FastifyReply) {
  const traceId=generateCustomUUID();
  const authHeader = request.headers.authorization;
  
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
  
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
  
    if (!user) {
      return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
  try {
    const { id } = request.params as { id: string };
    const qualificationType = await qualificationTypeModel.findByPk(id);
    if (qualificationType) {
      await qualificationType.update({
        is_enabled: false,
        is_deleted: true,
        modified_by: userId,
      })
      reply.status(200).send({
        status_code: 200,
        message: 'Qualification type deleted successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Qualification type not found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error: Failed to delete qualification type',
      trace_id: traceId,
      error: error as Error,
    });
  }
}


export async function getQualificationValueMaster(
  request: FastifyRequest<{ Querystring: { qualification_type?: string; page?: string; limit?: string } }>,
  reply: FastifyReply
) {
  try {
    const query = request.query as any;

    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    
    query.page && delete query.page;
    query.limit && delete query.limit;

    const searchConditions: any = { is_deleted: false };

    if (query.qualification_type) {
      searchConditions.slug = query.qualification_type;
    }

    const { rows: qualifications, count } = await QualificationValueMaster.findAndCountAll({
      where: searchConditions,
      order: [["created_on", "DESC"]],
      limit: limit,
      offset: offset,
    });

    return reply.status(200).send({
      status_code: 200,
      message: qualifications ? "Qualifications Found successfully" : "No Qualifications Found",
      items_per_page: limit,
      total_records: count,
      page,
      limit,
      qualifications,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}
