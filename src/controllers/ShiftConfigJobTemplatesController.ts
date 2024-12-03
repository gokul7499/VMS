import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import { ShiftConfigurationAttributes } from '../interfaces/shiftConfigurationInterface';
import ShiftConfigJobTemplate from '../models/ShiftConfigJobTemplatesModels';

export async function createShiftConfigJobTemplate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const shiftConfigJobTemplateData = request.body as ShiftConfigurationAttributes;
    const shiftConfigJobTemplate = await ShiftConfigJobTemplate.create({ ...shiftConfigJobTemplateData });
    reply.status(201).send({
      status_code: 201,
      id: shiftConfigJobTemplate.id,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: 'Internal Server Error',
      error,
    });
  }
}

export async function getShiftConfigJobTemplates(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as { page: string; limit: string };
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '10');
    const offset = (page - 1) * limit;
    const { rows: shiftConfigJobTemplates, count } = await ShiftConfigJobTemplate.findAndCountAll({
      where: { is_deleted: false },
      attributes: ['id', 'shift_config_id', 'job_template_ids'],
      limit,
      offset,
    });
    if (shiftConfigJobTemplates.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'ShiftConfigJobTemplates not found',
        shiftConfigJobTemplates: [],
      });
    }
    reply.status(200).send({
      status_code: 200,
      items_per_page: limit,
      total_records: count,
      shiftConfigJobTemplates,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: 'Internal Server Error',
      error,
    });
  }
}

export async function getShiftConfigJobTemplateById(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const shiftConfigJobTemplate = await ShiftConfigJobTemplate.findOne({
      where: { id, is_deleted: false },
      attributes: ['id', 'shift_config_id', 'job_template_ids'],
    });
    if (shiftConfigJobTemplate) {
      reply.status(200).send({
        status_code: 200,
        shiftConfigJobTemplate,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'ShiftConfigJobTemplate not found',
        shiftConfigJobTemplate: [],
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: 'Internal Server Error',
      error,
    });
  }
}

export async function updateShiftConfigJobTemplate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const shiftConfigJobTemplateData = request.body as ShiftConfigurationAttributes;
    const shiftConfigJobTemplate = await ShiftConfigJobTemplate.findOne({
      where: { id, is_deleted: false },
    });
    if (shiftConfigJobTemplate) {
      await shiftConfigJobTemplate.update({ ...shiftConfigJobTemplateData });
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'ShiftConfigJobTemplate updated successfully',
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'ShiftConfigJobTemplate not found',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: 'Internal Server Error',
      error,
    });
  }
}

export async function deleteShiftConfigJobTemplate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const shiftConfigJobTemplate = await ShiftConfigJobTemplate.findByPk(id);
    if (shiftConfigJobTemplate) {
      await shiftConfigJobTemplate.update({
        is_enabled: false,
        is_deleted: true,
      });
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'ShiftConfigJobTemplate deleted successfully',
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        trace_id: generateCustomUUID(),
        message: 'ShiftConfigJobTemplate not found',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: 'Internal Server Error',
      error,
    });
  }
}