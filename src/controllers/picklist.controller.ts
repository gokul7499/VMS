import { FastifyRequest, FastifyReply } from 'fastify';
import picklist_model from '../models/picklist.model';
import { picklist, PicklistItem } from '../interfaces/picklist.interface';
import { Programs } from "../models/programs.model"
import picklist_item_model from '../models/picklist-item.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { sequelize } from '../config/instance';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { error } from 'console';
import { multiply } from 'lodash';

export async function getPicklistById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const {
    name,
    picklist_id,
    is_enabled,
    defined_by,
    updated_on,
    picklist_items_count,
    search,
    page = 1,
    limit = 10,
  } = request.query as {
    name?: string;
    picklist_id?: string;
    is_enabled?: string;
    defined_by?: string;
    updated_on?: string;
    picklist_items_count?: string;
    search?: string;
    page?: string;
    limit?: string;
  };

  try {
    let whereClause: any = {
      is_deleted: false,
    };

    if (search) {
      const searchFields = [
        "name",
        "picklist_id",
        "is_enabled",
        "defined_by",
        "updated_on",
      ];
      const [searchField, searchValue] = search.includes(":")
        ? search.split(":")
        : ["", search];
      if (searchField && searchFields.includes(searchField)) {
        whereClause[searchField] = {
          [Op.like]: `%${searchValue}%`,
        };
      } else {
        whereClause[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.like]: `%${search}%` },
        }));
      }
    }

    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (picklist_id)
      whereClause.picklist_id = { [Op.like]: `%${picklist_id}%` };
    if (is_enabled !== undefined)
      whereClause.is_enabled = is_enabled === "true";
    if (defined_by) whereClause.defined_by = defined_by;
    if (updated_on) whereClause.updated_on = parseInt(updated_on, 10);

    const pageNumber = parseInt(page as any, 10) || 1;
    const limitNumber = parseInt(limit as any, 10) || 10;

    // Calculate offset for pagination
    const offset = (pageNumber - 1) * limitNumber;

    let picklists = await picklist_model.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: picklist_item_model,
          as: "picklistItems",
          where: { is_deleted: false },
          required: false,
        },
      ],
      distinct: true,
      order: [["updated_on", "DESC"]],
    });

    let predefinedPicklists = picklists.rows.filter(
      (picklist) => picklist.defined_by === "predefined"
    );
    const programDefinedPicklists = picklists.rows.filter(
      (picklist) => picklist.program_id === program_id
    );

    if (name)
      predefinedPicklists = predefinedPicklists.filter((picklist) =>
        picklist.name?.toLowerCase().includes(name.toLowerCase())
      );
    if (picklist_id)
      predefinedPicklists = predefinedPicklists.filter((picklist) =>
        picklist.picklist_id?.toLowerCase().includes(picklist_id.toLowerCase())
      );
    if (is_enabled !== undefined)
      predefinedPicklists = predefinedPicklists.filter(
        (picklist) => picklist.is_enabled === (is_enabled === "true")
      );
    if (defined_by)
      predefinedPicklists = predefinedPicklists.filter(
        (picklist) => picklist.defined_by === defined_by
      );
    if (updated_on)
      predefinedPicklists = predefinedPicklists.filter(
        (picklist) => Number(picklist.updated_on) === parseInt(updated_on, 10)
      );
    if (picklist_items_count) {
      const countFilter = parseInt(picklist_items_count, 10);
      predefinedPicklists = predefinedPicklists.filter(
        (picklist) => picklist.picklistItems.length === countFilter
      );
    }

    let picklistsData = [
      ...programDefinedPicklists,
      ...predefinedPicklists,
    ].map((picklist: any) => ({
      id: picklist.id,
      name: picklist.name,
      picklist_id: picklist.picklist_id,
      description: picklist.description,
      slug: picklist.slug,
      is_enabled: picklist.is_enabled,
      updated_on: picklist.updated_on,
      disabled_program: picklist.disabled_program,
      is_visible: picklist.is_visible,
      program_id: picklist.program_id,
      defined_by: picklist.defined_by,
      picklist_items_count: picklist.picklistItems.length,
    }));

    const totalPicklists = picklistsData.length;
    const paginatedPicklists = picklistsData.slice(
      offset,
      offset + limitNumber
    );

    reply.status(200).send({
      status_code: 200,
      message: "Picklists retrieved successfully",
      trace_id: traceId,
      picklists: paginatedPicklists,
      total_records: totalPicklists,
      error
    });
  } catch (error) {
    console.error("Error fetching picklists:", error);
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error. Unable to fetch picklists.",
      trace_id: traceId,
    });
  }
}

const generateRandomPrefix = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    result += letters[randomIndex];
  }
  return result;
};

export const createPicklist = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { picklist_items, ...picklist_data } = request.body as {
    picklistItems?: PicklistItem[];
    [key: string]: any;
  };
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }
  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    return reply.status(401).send({ message: "Unauthorized - Invalid token" });
  }
  const userId = user?.sub;

  logger(
    {
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: userId },
      data: request.body,
      eventname: "creating picklist",
      status: "in_progress",
      description: `Creating picklist for program_id: ${program_id}`,
      level: "info",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    },
    picklist_model
  );

  try {
    const programData = await Programs.findOne({ where: { id: program_id } });
    if (!programData) {
      return reply.status(200).send({
        status_code: 200,
        message: "Program not found",
        trace_id: traceId,
      });
    }

    if (picklist_data.name) {
      const existingPicklist = await picklist_model.findOne({
        where: {
          name: picklist_data.name,
          program_id,
          is_deleted: false,
        },
      });
      if (existingPicklist) {
        return reply.status(400).send({
          status_code: 400,
          message: "Picklist with this name already exists",
          trace_id: traceId,
        });
      }
    }

    if (picklist_data.slug === undefined) {
      picklist_data.slug = picklist_data.name.toLowerCase();
    }

    const typed_picklist_data: Omit<picklist, "picklist_items"> =
      picklist_data as Omit<picklist, "picklist_items">;
    const transaction = await sequelize.transaction();

    const idPrefix = generateRandomPrefix();
    const uniqId = programData.unique_id;
    const generatedPicklistId = `${uniqId}-PL-${idPrefix}`;
    console.log(generatedPicklistId);
    typed_picklist_data.picklist_id = generatedPicklistId;

    try {
      const picklist = await picklist_model.create({ ...typed_picklist_data, updated_by: userId, created_by: userId }, {
        transaction,
      });
      if (picklist_items && picklist_items.length > 0) {
        const items = picklist_items.map((item: PicklistItem) => ({
          ...item,
          picklist_id: picklist.id,
        }));
        items.created_by = userId
        items.updated_by = userId
        await picklist_item_model.bulkCreate(items, { transaction });
      }

      await transaction.commit();

      logger(
        {
          trace_id: traceId,
          actor: { user_name: user?.preferred_username, user_id: userId },
          data: request.body,
          eventname: "created picklist",
          status: "success",
          description: `Created picklist for program_id: ${program_id} successfully: ${picklist.id}`,
          level: "success",
          action: request.method,
          url: request.url,
          entity_id: program_id,
          is_deleted: false,
        },
        picklist_model
      );

      reply.status(201).send({
        status_code: 201,
        message: "Picklist saved successfully.",
        trace_id: traceId,
        id: picklist.id,
      });
    } catch (error) {
      await transaction.rollback();

      logger(
        {
          trace_id: traceId,
          actor: { user_name: user?.preferred_username, user_id: userId },
          data: request.body,
          eventname: "creating picklist",
          status: "error",
          description: `Error creating picklist for program_id: ${program_id}`,
          level: "error",
          action: request.method,
          url: request.url,
          entity_id: program_id,
          is_deleted: false,
        },
        picklist_model
      );

      reply.status(500).send({
        status_code: 500,
        message: `Error creating picklist: ${error}.`,
        trace_id: traceId,
      });
    }
  } catch (error) {
    logger(
      {
        trace_id: traceId,
        actor: { user_name: user?.preferred_username, user_id: userId },
        data: request.body,
        eventname: "creating picklist",
        status: "error",
        description: `Error fetching picklist data for program_id: ${program_id}`,
        level: "error",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      picklist_model
    );

    reply.status(500).send({
      status_code: 500,
      message: `Error fetching picklist data: ${error}`,
      trace_id: traceId,
    });
  }
};

export async function deletePicklist(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }
  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    return reply.status(401).send({ message: "Unauthorized - Invalid token" });
  }
  const userId = user?.sub;
  const traceId = generateCustomUUID();
  const { id, program_id } = request.params as { id: string; program_id: string };

  const picklist = await picklist_model.findOne({
    where: { id, program_id },
  });

  if (!picklist) {
    return reply.status(200).send({
      status_code: 200,
      message: "Picklist not found",
      trace_id: traceId,
    });
  }

  await picklist.update({
    is_enabled: false,
    is_deleted: true,
    updated_by: userId
  });

  return reply.status(200).send({
    status_code: 200,
    message: "Picklist successfully deleted",
    trace_id: traceId,
  });
}
export async function deletePredefinedPicklist(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }
  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    return reply.status(401).send({ message: "Unauthorized - Invalid token" });
  }
  const userId = user?.sub;
  const traceId = generateCustomUUID();
  const { id } = request.params as { id: string };

  const picklist = await picklist_model.findOne({
    where: { id },
  });

  if (!picklist) {
    return reply.status(200).send({
      status_code: 200,
      message: "Picklist not found",
      trace_id: traceId,
    });
  }

  await picklist.update({
    is_enabled: false,
    is_deleted: true,
    updated_by: userId
  });

  return reply.status(200).send({
    status_code: 200,
    message: "Picklist successfully deleted",
    trace_id: traceId,
  });
}



export const updatePicklistAndItem = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { id, program_id } = request.params as { id: string; program_id: string };
  const { picklist_items, ...picklist_data } = request.body as picklist;
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }
  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    return reply.status(401).send({ message: "Unauthorized - Invalid token" });
  }
  const userId = user?.sub;
  try {
    let picklist;
    if (picklist_data.defined_by === "PREDEFINED") {
      const existingPicklistWithSameName = await picklist_model.findOne({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn("lower", sequelize.col("name")),
              sequelize.fn("lower", picklist_data.name)
            ),
            { id: { [Op.ne]: id } },
            { is_deleted: false },
          ],
        },
      });

      if (existingPicklistWithSameName) {
        return reply.status(400).send({
          status_code: 400,
          message: "Picklist with the same name already exists.",
          trace_id: traceId,
        });
      }

      picklist = await picklist_model.findOne({
        where: { id },
      });
    } else {
      const existingPicklistWithSameName = await picklist_model.findOne({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn("lower", sequelize.col("name")),
              sequelize.fn("lower", picklist_data.name)
            ),
            { id: { [Op.ne]: id } },
            { program_id },
            { is_deleted: false },
          ],
        },
      });

      if (existingPicklistWithSameName) {
        return reply.status(400).send({
          status_code: 400,
          message: "Picklist with the same name already exists.",
          trace_id: traceId,
        });
      }

      picklist = await picklist_model.findOne({
        where: { id, program_id },
      });
    }

    if (!picklist) {
      return reply.status(200).send({
        status_code: 200,
        message: `Picklist with ID ${id} not found`,
        trace_id: traceId,
      });
    }

    const transaction = await sequelize.transaction();

    try {
      await picklist.update({ ...picklist_data, updated_by: userId }, { transaction });

      if (picklist_items && picklist_items.length > 0) {
        await picklist_item_model.destroy({ where: { picklist_id: id }, transaction });
        const newPicklistItems = picklist_items.map((item) => ({
          ...item,
          picklist_id: id,
          program_id,
          created_by: userId,
          updated_by: userId,
        }));

        await picklist_item_model.bulkCreate(newPicklistItems, { transaction });
      }

      await transaction.commit();

      return reply.status(200).send({
        status_code: 200,
        message: "Successfully updated picklist and items",
        trace_id: traceId,
      });
    } catch (error) {
      await transaction.rollback();

      return reply.status(500).send({
        status_code: 500,
        message: `Error updating picklist and items`,
        trace_id: traceId,
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return reply.status(500).send({
      status_code: 500,
      message: `Error fetching picklist or validation: ${errorMessage}`,
      trace_id: traceId,
    });
  }
};

export const getPicklistAndPicklistItem = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { program_id, picklist_id } = request.params as { program_id: string; picklist_id: string };

  // Validate that the parameters are not undefined or null
  if (!program_id || !picklist_id) {
    return reply.status(400).send({
      status_code: 400,
      message: "Program ID and Picklist ID are required",
    });
  }

  try {
    const picklists = await picklist_model.findAll({
      where: {
        program_id,
      },
      attributes: {
        exclude: ["is_deleted", "created_on", "created_by", "updated_by"],
      },
      include: [
        {
          model: picklist_item_model,
          as: "picklistItems",
          where: { picklist_id, program_id, is_deleted: false },
          required: true,
          attributes: {
            exclude: [
              "is_deleted",
              "created_on",
              "updated_on",
              "created_by",
              "updated_by",
            ],
          },
        },
      ],
    });

    if (picklists.length > 0) {
      // Assuming you want to return the first picklist as an object
      const picklist = picklists[0];
      const response = {
        status_code: 200,
        message: "Get PicklistAndPicklistItemt successfully",
        trace_id: traceId,
        picklist,
      };

      reply.status(200).send(response);
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "No picklists found for the given criteria",
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
    });
  }
};

export async function getAllPickListByProgramId(request: FastifyRequest, reply: FastifyReply) {
  const { name, picklist_id, program_id, label, slug, defined_by } = request.query as { name?: string, picklist_id?: string, program_id?: string, label?: string, slug?: string, defined_by: string };
  let picklistData;
  try {
    const whereCondition: any = {};
    if (slug) {
      whereCondition.slug = slug;
    }
    if (defined_by) {
      whereCondition.defined_by = defined_by;
    }
    if (name) {
      whereCondition.name = name;
    }
    if (program_id) {
      whereCondition.program_id = program_id;
    }
    if (picklist_id) {
      whereCondition.id = picklist_id;
    }
    picklistData = await picklist_model.findAll({
      where: whereCondition,
      include: [
        {
          model: picklist_item_model,
          as: "picklistItems",
          where: {
            is_deleted: false,
            ...(label && { label }),
            ...(program_id && { program_id }),
            ...(picklist_id && { picklist_id }),
          },
          required: false,
          attributes: {
            exclude: ["created_on", "updeted_on", "created_by", "updated_by"],
            include: [
              "picklist_id",
              "label",
              "value",
              "is_deleted",
              "is_enabled",
              "defined_by",
            ],
          },
        },
      ],
      order: [['name', 'ASC']],
    });

    if (picklistData.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Pick list data not found",
        picklist_data: [],
      });
    }
    let responseData;
    if (slug && slug == "rate type category") {
      const customOrder = ["Standard", "Over Time", "Double Time", "Holiday", "Weekend", "Other"];
      const orderMap = Object.fromEntries(customOrder.map((value, index) => [value, index]));
      responseData = picklistData.map(picklist => ({
        id: picklist.id,
        program_id: picklist.program_id,
        name: picklist.name,
        is_enabled: picklist.is_enabled,
        is_deleted: picklist.is_deleted,
        is_visible: picklist.is_visible,
        defined_by: picklist.defined_by,
        created_on: picklist.created_on,
        multiselect: picklist.multiselect,
        picklistItems: picklist.picklistItems.sort(
          (a: { value: string }, b: { value: string }) =>
            (orderMap[a.value] ?? Infinity) - (orderMap[b.value] ?? Infinity)
        ),
      }));

    }
    else {
      responseData = picklistData.map((picklist) => ({
        id: picklist.id,
        program_id: picklist.program_id,
        name: picklist.name,
        is_enabled: picklist.is_enabled,
        is_deleted: picklist.is_deleted,
        is_visible: picklist.is_visible,
        defined_by: picklist.defined_by,
        created_on: picklist.created_on,
        multiselect: picklist.multiselect,
        picklistItems: picklist.picklistItems
          .map((item: any) => ({
            id: item.id,
            picklist_id: item.picklist_id,
            label: item.label,
            value: item.value,
            is_deleted: item.is_deleted,
            is_enabled: item.is_enabled,
            defined_by: item.defined_by,
            meta_data: item.meta_data,
            slug: item.slug,
          }))
          .sort((a: { label: string }, b: { label: any }) =>
            a.label.localeCompare(b.label)
          ),
      }));
    }
    return reply.status(200).send({
      status_code: 200,
      message: "Pick list data retrieved successfully",
      picklist_data: responseData,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: "An error occurred while retrieving pick list data",
      error: error.message,
    });
  }
}

export const createPicklistData = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { picklist_items, ...picklist_data } = request.body as {
    picklistItems?: PicklistItem[];
    [key: string]: any;
  };

  const traceId = generateCustomUUID();

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }
  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    return reply.status(401).send({ message: "Unauthorized - Invalid token" });
  }
  const userId = user?.sub;

  logger(
    {
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: userId },
      data: request.body,
      eventname: "creating picklist",
      status: "in_progress",
      description: "Creating picklist",
      level: "info",
      action: request.method,
      url: request.url,
      is_deleted: false,
    },
    picklist_model
  );

  try {
    if (picklist_data.name) {
      const existingPicklist = await picklist_model.findOne({
        where: {
          name: picklist_data.name,
          is_deleted: false,
        },
      });
      if (existingPicklist) {
        return reply.status(400).send({
          status_code: 400,
          message: "Picklist with this name already exists",
          trace_id: traceId,
        });
      }
    }

    if (picklist_data.slug === undefined) {
      picklist_data.slug = picklist_data.name.toLowerCase();
    }
    const typed_picklist_data: Omit<picklist, "picklist_items"> =
      picklist_data as Omit<picklist, "picklist_items">;
    const transaction = await sequelize.transaction();
    const idPrefix = generateRandomPrefix();
    const uniqId = "SIMPL";
    const generatedPicklistId = `${uniqId}-PL-${idPrefix}`;
    console.log(generatedPicklistId);
    typed_picklist_data.picklist_id = generatedPicklistId;

    try {
      const picklist = await picklist_model.create(
        { ...typed_picklist_data, updated_by: userId, created_by: userId },
        { transaction }
      );

      if (picklist_items && picklist_items.length > 0) {
        const items = picklist_items.map((item: PicklistItem) => ({
          ...item,
          picklist_id: picklist.id,
          created_by: userId,
          updated_by: userId,
        }));
        await picklist_item_model.bulkCreate(items, { transaction });
      }
      await transaction.commit();

      logger(
        {
          trace_id: traceId,
          actor: { user_name: user?.preferred_username, user_id: userId },
          data: request.body,
          eventname: "created picklist",
          status: "success",
          description: `Created picklist successfully: ${picklist.id}`,
          level: "success",
          action: request.method,
          url: request.url,
          is_deleted: false,
        },
        picklist_model
      );

      reply.status(201).send({
        status_code: 201,
        message: "Picklist saved successfully.",
        trace_id: traceId,
        id: picklist.id,
      });
    } catch (error) {
      await transaction.rollback();

      logger(
        {
          trace_id: traceId,
          actor: { user_name: user?.preferred_username, user_id: userId },
          data: request.body,
          eventname: "creating picklist",
          status: "error",
          description: `Error creating picklist`,
          level: "error",
          action: request.method,
          url: request.url,
          is_deleted: false,
        },
        picklist_model
      );

      reply.status(500).send({
        status_code: 500,
        message: `Error creating picklist: ${error}.`,
        trace_id: traceId,
      });
    }
  } catch (error) {
    logger(
      {
        trace_id: traceId,
        actor: { user_name: user?.preferred_username, user_id: userId },
        data: request.body,
        eventname: "creating picklist",
        status: "error",
        description: `Error processing request`,
        level: "error",
        action: request.method,
        url: request.url,
        is_deleted: false,
      },
      picklist_model
    );

    reply.status(500).send({
      status_code: 500,
      message: `Error processing request: ${error}`,
      trace_id: traceId,
    });
  }
};


export const getPicklistFilter = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, picklist_id, program_id, label, slug, defined_by, is_deleted, is_enabled, updated_on, page = 1, limit = 10 } =
    request.body as {
      name?: string;
      picklist_id?: string;
      program_id?: string;
      label?: string;
      slug?: string;
      defined_by?: string;
      is_deleted?: boolean;
      is_enabled?: boolean;
      updated_on?: string[];
      page?: number;
      limit?: number;
    };

  let picklistData;
  try {
    const whereCondition: any = {};
    if (slug) whereCondition.slug = slug;
    if (defined_by) whereCondition.defined_by = defined_by;
    if (name) whereCondition.name = { [Op.like]: `%${name}%` };  
    if (program_id) whereCondition.program_id = program_id;
    if (picklist_id) whereCondition.id = picklist_id;
    if (is_deleted !== undefined) whereCondition.is_deleted = is_deleted;
    if (is_enabled !== undefined) whereCondition.is_enabled = is_enabled;

    if (Array.isArray(updated_on) && updated_on.length === 2) {
      const [startTimestamp, endTimestamp] = updated_on.map(ts => parseInt(ts, 10));
      whereCondition.updated_on = { [Op.between]: [startTimestamp, endTimestamp] };
    }

    const pageNumber = parseInt(page as unknown as string, 10);
    const pageSize = parseInt(limit as unknown as string, 10);
    const offset = (pageNumber - 1) * pageSize;

    const { rows: picklistDataRows, count: total_records } = await picklist_model.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: picklist_item_model,
          as: "picklistItems",
          where: {
            is_deleted: false,
            ...(label && { label }),
            ...(program_id && { program_id }),
            ...(picklist_id && { picklist_id }),
          },
          required: false,
          attributes: {
            exclude: ["created_on", "created_by", "updated_by"],
            include: ["picklist_id", "label", "value", "is_deleted", "is_enabled", "defined_by"],
          },
        },
      ],
      order: [["name", "ASC"]],
      offset,
      limit: pageSize,
    });

    if (picklistDataRows.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Pick list data not found",
        picklist_data: [],
        total_records,
        page: pageNumber,
        limit: pageSize,
      });
    }

    let responseData;
    if (slug === "rate type category") {
      const customOrder = ["Standard", "Over Time", "Double Time", "Holiday", "Weekend", "Other"];
      const orderMap = Object.fromEntries(customOrder.map((value, index) => [value, index]));

      responseData = picklistDataRows.map((picklist) => ({
        id: picklist.id,
        program_id: picklist.program_id,
        name: picklist.name,
        slug: picklist.slug,
        picklist_id: picklist.picklist_id,
        is_enabled: picklist.is_enabled,
        is_deleted: picklist.is_deleted,
        is_visible: picklist.is_visible,
        defined_by: picklist.defined_by,
        created_on: picklist.created_on,
        picklist_value_count: picklist.picklistItems.length,
        picklistItems: picklist.picklistItems.sort(
          (a: { value: string }, b: { value: string }) =>
            (orderMap[a.value] ?? Infinity) - (orderMap[b.value] ?? Infinity)
        ),
      }));
    } else {
      responseData = picklistDataRows.map((picklist) => ({
        id: picklist.id,
        program_id: picklist.program_id,
        name: picklist.name,
        slug: picklist.slug,
        picklist_id: picklist.picklist_id,
        is_enabled: picklist.is_enabled,
        is_deleted: picklist.is_deleted,
        is_visible: picklist.is_visible,
        defined_by: picklist.defined_by,
        created_on: picklist.created_on,
        updated_on: picklist.updated_on,
        picklist_value_count: picklist.picklistItems.length,
        picklistItems: picklist.picklistItems
          .map((item: any) => ({
            id: item.id,
            picklist_id: item.picklist_id,
            label: item.label,
            value: item.value,
            is_deleted: item.is_deleted,
            is_enabled: item.is_enabled,
            defined_by: item.defined_by,
            meta_data: item.meta_data,
            slug: item.slug,
          }))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)),
      }));
    }

    return reply.status(200).send({
      status_code: 200,
      message: "Pick list data retrieved successfully",
      picklist_data: responseData,
      total_records,
      page: pageNumber,
      limit: pageSize,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: "An error occurred while retrieving pick list data",
      error: error.message,
    });
  }
};
