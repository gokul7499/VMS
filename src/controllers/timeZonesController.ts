import { FastifyRequest, FastifyReply } from 'fastify';
import TimeZone from '../models/timeZoneModel';
import generateCustomUUID from "../utility/genrateTraceId"
import { Op } from 'sequelize';
export const getAllTimeZones = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, code } = request.query as { name?: string; code?: string };

  const whereConditions: any = {};

  if (name) {
    whereConditions.name = { [Op.like]: `%${name}%` };
  }

  if (code) {
    whereConditions.code = { [Op.like]: `%${code}%` };
  }
  const timeZones = await TimeZone.findAll({ where: whereConditions });
  if (timeZones.length === 0) {
    return reply.status(200).send({ message: "TimeZones not found", timeZones: [] });
  }
  reply.send(timeZones);
};

export const bulkUploadTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const timeZoneData = request.body as any[];
    const createdTimeZone = await TimeZone.bulkCreate(timeZoneData);
    reply.status(201).send({
      status_code: 201,
      data: createdTimeZone,
      message: 'time_zone Created successfully',
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create time_zone',
      trace_id: generateCustomUUID(),
      error: error,
    });
  }
};

export const getTimeZoneById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const timeZone = await TimeZone.findByPk(id);
  if (timeZone) {
    reply.send(timeZone);
  } else {
    reply.status(200).send({ message: 'Time zone not found', timeZone: [] });
  }
};

export const createTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  const { code, name, offset, utc_offset, region, num } = request.body as {
    code: string;
    name: string;
    offset: number;
    utc_offset: string;
    region: string;
    num: string;
  };

  try {
    const newTimeZone = await TimeZone.create({
      code,
      name,
      offset,
      utc_offset,
      region,
      num
    });
    reply.status(201).send(newTimeZone);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const updateTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const { code, name, offset, utcOffset, region, num } = request.body as {
    code?: string;
    name?: string;
    offset?: number;
    utcOffset?: string;
    region?: string;
    num?: string;
  };

  const timeZone = await TimeZone.findByPk(id);
  if (timeZone) {
    await timeZone.update({
      code,
      name,
      offset,
      utcOffset,
      region,
      num
    });
    reply.send(timeZone);
  } else {
    reply.status(200).send({ message: 'Time zone not found' });
  }
};

export const deleteTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const timeZone = await TimeZone.findByPk(id);
  if (timeZone) {
    await timeZone.destroy();
    reply.status(204).send();
  } else {
    reply.status(200).send({ message: 'Time zone not found' });
  }
};