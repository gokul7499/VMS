import { FastifyRequest, FastifyReply } from "fastify";
import holidayCalendar from "../models/holiday-calendar.model";
import { holidayCalendarData } from "../interfaces/holiday-calendar.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes } from "sequelize";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";

export async function getHolidayCalendar(
  request: FastifyRequest<{ Params: { program_id: string }, Querystring: { name?: string, year?: number, is_enabled?: string, modified_on?: string, page?: string, limit?: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params;
    const { name, year, is_enabled, modified_on, page = '1', limit = '10' } = request.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filters: any = { program_id, is_deleted: false };

    if (name) {
      filters.name = { [Op.like]: `%${name}%` };
    }

    if (year) {
      filters.year = year;
    }

    if (is_enabled !== undefined) {
      filters.is_enabled = is_enabled === 'true';
    }

    if (modified_on) {
      const modifiedOnRange = modified_on.split(',').map(Number);
      if (modifiedOnRange.length === 2) {
        filters.modified_on = { [Op.between]: [modifiedOnRange[0], modifiedOnRange[1]] };
      }
    }

    const offset = (pageNum - 1) * limitNum;

    const { rows: holiday_calendars, count: totalRecords } = await holidayCalendar.findAndCountAll({
      where: filters,
      attributes: ['id', 'name', 'year', 'is_enabled', 'modified_on', 'program_id'],
      offset,
      limit: limitNum,
      order: [['modified_on', 'DESC']],
    });

    reply.status(200).send({
      status_code: 200,
      message: holiday_calendars.length > 0 ? 'HolidayCalendars fetched successfully.' : 'No holidayCalendars found.',
      trace_id: traceId,
      holiday_calendars,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
        currentPage: pageNum
      }
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching holidayCalendars.',
      trace_id: traceId,
      error,
    });
  }
}

export async function getHolidayCalendarById(
  request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id, id } = request.params;

    const holiday_calendar = await holidayCalendar.findOne({ where: { program_id, id } });

    if (holiday_calendar) {
      let hierarchiesdata: object[] = [];
      const hierarchyIds = holiday_calendar.hierarchy_units_ids || [];
      if (hierarchyIds.length > 0) {
        const hierarchiesQuery = `
          SELECT id, name
          FROM hierarchies
          WHERE id IN (:hierarchyIds)
        `;
        hierarchiesdata = await sequelize.query(hierarchiesQuery, {
          replacements: { hierarchyIds },
          type: QueryTypes.SELECT
        });
      }

      let workLocationdata: object[] = [];
      const workLocationIds = holiday_calendar.work_locations_ids || [];
      if (workLocationIds.length > 0) {
        const workLocationQuery = `
          SELECT id, name
          FROM work_locations
          WHERE id IN (:workLocationIds)
        `;
        workLocationdata = await sequelize.query(workLocationQuery, {
          replacements: { workLocationIds },
          type: QueryTypes.SELECT
        });
      }

      reply.status(200).send({
        status_code: 200,
        message: 'HolidayCalendar fetched successfully.',
        trace_id: traceId,
        holiday_calendar: {
          ...holiday_calendar.toJSON(),
          hierarchy_units_ids: hierarchiesdata,
          work_locations_ids: workLocationdata
        }
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'HolidayCalendar not found.',
        holidayCalendar: []
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: 'An error occurred while fetching holidayCalendar.',
      trace_id: traceId,
      error: error,
    });
  }
}

export const createHolidayCalendar = async (request: FastifyRequest, reply: FastifyReply) => {
  const holiday_calendar = request.body as holidayCalendarData;
  const program_id = holiday_calendar.program_id;
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
  }
  const userId = user?.sub
  const traceId = generateCustomUUID();

  if (!holiday_calendar.is_all_hierarchies && (!holiday_calendar.hierarchy_units_ids || holiday_calendar.hierarchy_units_ids.length === 0)) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: "create holiday calendar",
        status: "error",
        description: 'hierarchy_units is required when is_all_hierarchies is false.',
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      holidayCalendar
    );

    return reply.status(400).send({
      status_code: 400,
      trace_id: traceId,
      message: 'hierarchy_units is required when is_all_hierarchies is false.',
    });
  }

  if (!holiday_calendar.is_all_work_locations && (!holiday_calendar.work_locations_ids || holiday_calendar.work_locations_ids.length === 0)) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: "create holiday calendar",
        status: "error",
        description: 'work_locations is required when is_all_work_locations is false.',
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      holidayCalendar
    );

    return reply.status(400).send({
      status_code: 400,
      trace_id: traceId,
      message: 'work_locations is required when is_all_work_locations is false.',
    });
  }

  try {
    await holidayCalendar.create({
      ...holiday_calendar, created_by: userId,
      modified_by: userId,
    });

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: "create holiday calendar",
        status: "success",
        description: `HolidayCalendar created successfully.`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      holidayCalendar
    );

    reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: 'HolidayCalendar created successfully.',
    });
  } catch (error) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: "create holiday calendar",
        status: "error",
        description: `An error occurred while creating holidayCalendar.`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      holidayCalendar
    );

    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating holidayCalendar.',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
};

export const updateHolidayCalendar = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params as { program_id: string, id: string };
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
  const userId = user?.sub

  try {
    const [updatedCount] = await holidayCalendar.update({ ...request.body as holidayCalendarData, modified_by: userId }, { where: { program_id, id } });
    if (updatedCount > 0) {
      reply.status(201).send({
        status_code: 201,
        message: 'HolidayCalendar updated successfully.',
        id,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'HolidayCalendar not found.',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server error',
      trace_id: traceId,
      error
    });
  }
};

export async function deleteHolidayCalendar(
  request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID()
  try {
    const { program_id, id } = request.params;
    const holidayCalendarData = await holidayCalendar.findOne({ where: { program_id, id } });
    if (holidayCalendarData) {
      await holidayCalendar.update({ is_deleted: true, is_enabled: false }, { where: { program_id, id } });
      reply.status(204).send({
        status_code: 204,
        message: 'HolidayCalendar deleted successfully.',
        trace_id: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'HolidayCalendar not found.'
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: 'An error occurred while deleting holidayCalendar.',
      trace_id: traceId,
      error: error,
    });
  }
}
