
import { FastifyRequest, FastifyReply } from 'fastify';
import jobCategoryModel from '../models/job-category.model';
import { JobCategoryInterface } from '../interfaces/job-category.interface';
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import { decodeToken } from '../middlewares/verifyToken';

export async function getAllJobCategory(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['id'];
  const responseFields = ['id', 'category', 'title'];
  let categoryData = await baseSearch(request, reply, jobCategoryModel, searchFields, responseFields);
  reply.status(200).send(categoryData);
}

export async function getJobCategoryById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const category = await jobCategoryModel.findOne({
      where: { id },
      attributes: { exclude: ['is_deleted', 'is_enabled', 'created_on', 'modified_on', 'created_by', 'modified_by'] },
    });
    if (category) {
      reply.status(200).send({
        statusCode: 200,
        category: category,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({ message: 'Job category data not found.', category: [] });
    }
  } catch (error) {
    reply.status(500).send({ message: 'An error occurred while fetching job category data.', error });
  }
}

export async function createJobCategory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const traceId = generateCustomUUID();
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
    const JobCategoryData: JobCategoryInterface = request.body as JobCategoryInterface;
    const newJobCategory = await jobCategoryModel.create({
      ...JobCategoryData,
      created_by: userId,
      modified_by: userId,
      created_on: Date.now(),
      modified_on: Date.now()
    });

    reply.status(201).send({
      statusCode: 201,
      message: 'Job category created successfully.',
      id: newJobCategory?.id,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      message: "Internal Server error.",
      error,
      trace_id: traceId,
    });
  }
}

export async function updateJobCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
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
    const { id } = request.params;
    const jobcategory = request.body as JobCategoryInterface;
    const [numRowsUpdated] = await jobCategoryModel.update({
      ...jobcategory,
      modified_by: userId,
      modified_on: Date.now()
    }, { where: { id } }
    );
    reply.status(200).send({
      statusCode: 200,
      message: "Job category updated successfully.",
      trace_id: traceId,
    });
  }
  catch (error) {
    reply.status(500).send({
      message: "Internal Server error.",
      error,
      trace_id: traceId,
    });
  }
}

export async function deleteJobCategory(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params as { id: string, };
    const jobcategory_data = await jobCategoryModel.findOne({ where: { id } });
    if (jobcategory_data) {
      await jobCategoryModel.update({ is_deleted: true, is_enabled: false }, { where: { id } });
      reply.status(200).send({
        status_code: 200,
        message: 'Job category deleted successfully.',
      });

    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Job category not found.',
        category: [],
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: 'An error occurred while deleting job category',
      trace_id: traceId,
      error: error,
    });
  }
}

