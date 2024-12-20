import WorkLocationModel from "../models/work-location.model";
import { WorkLocationInterface } from "../interfaces/work-location.interface";
import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import TimeZone from "../models/time-zone.model";
import Currencies from "../models/currencies.model";
import CountryModel from "../models/countries.model";
import WorkLocationCurrency from "../models/WorkLocationCurrencyModel";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op } from "sequelize";

export async function createWorkLocation(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const workLocation = request.body as WorkLocationInterface;
  const traceId = generateCustomUUID();
  const program_id = workLocation.program_id;

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
  }
  try {
    const [workLocationData, created] = await WorkLocationModel.findOrCreate({
      where: { code: workLocation.code, program_id },
      defaults: { ...workLocation },
    });

    if (!created) {
      return reply.status(400).send({
        status_code: 400,
        message: `Work location with code '${workLocation.code}' already exists.`,
        trace_id: traceId,
      });
    }
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating work location",
        status: "success",
        description: `Creating work location for ${program_id}`,
        level: "info",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      WorkLocationModel
    );

    if (workLocation.currencies && workLocation.currencies.length > 0) {
      for (const currency of workLocation.currencies) {
        await WorkLocationCurrency.create({
          work_location_id: workLocationData.id,
          currency_id: currency.id,
          is_default: currency.is_default,
        });
      }
    }

    reply.status(201).send({
      status_code: 201,
      message: "Work location created successfully",
      workLocation: workLocationData.id,
      trace_id: traceId,
    });

    logger(
      {
        traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "created work location",
        status: "success",
        description: `Created work location for ${program_id} successfully: ${workLocationData.id}`,
        level: "success",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      WorkLocationModel
    );
  } catch (error) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create work location",
        status: "error",
        description: `Error creating work location for ${program_id}`,
        level: "error",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      WorkLocationModel
    );

    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to create work location",
      error,
    });
  }
}

export async function getAllWorkLocations(
  request: FastifyRequest<{ Querystring: WorkLocationInterface }>,
  reply: FastifyReply
) {
  const traceId=generateCustomUUID();
  try {
    const params = request.params as WorkLocationInterface;
    const query = request.query as WorkLocationInterface | any;
    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    delete query.page;
    delete query.limit;

    const country_ids = query.country_id ? query.country_id.split(",").map((id: string) => id.trim()) : [];
    delete query.country_id;
    if (query.is_enabled) {
      query.is_enabled = query.is_enabled !== "false";
    }
    let order: [string, string][] = [["modified_on", "DESC"]];
    if (query.sort === "1") {
      order = [["modified_on", "ASC"]];
    } else if (query.sort === "-1") {
      order = [["modified_on", "DESC"]];
    }
    const whereClause: any = {
      ...query,
      program_id: params.program_id,
      is_deleted: false
    };
    if (country_ids.length > 0) {
      whereClause.country_id = { [Op.in]: country_ids };
    }
    if (query.state_name) {
      whereClause.state_name = { [Op.like]: `%${query.state_name}%` };
    }
    const workLocations = await WorkLocationModel.findAll({
      where: whereClause,
      limit,
      offset,
      order,
      include: [
        {
          model: TimeZone,
          as: 'time_zones',
          attributes: ['id', 'name'],
        },
        {
          model: CountryModel,
          as: 'countries',
          attributes: ['id', 'name'],
        }
      ]
    });
    for (const location of workLocations) {
      const currencyIds = location.currency_id as string[] || [];
      if (currencyIds.length > 0) {
        const currencies = await Currencies.findAll({
          where: { id: currencyIds },
          attributes: ['id', 'name']
        });
        location.dataValues.currencies = currencies;
      } else {
        location.dataValues.currencies = [];
      }
    }

    const count = await WorkLocationModel.count({
      where: whereClause,
    });
    if (workLocations.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        items_per_page: limit,
        total_records: count,
        trace_id:traceId,
        message: "Worklocation not found.",
        work_locations: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: generateCustomUUID(),
      items_per_page: limit,
      total_records: count,
      message: "Worklocation fetched successfully.",
      work_locations: workLocations
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id:traceId,
      message: "Internal Server Error",
      error,
    });
  }
}

export async function getWorkLocationById(
  request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
  reply: FastifyReply
) {

  const traceId = generateCustomUUID();

  const { id, program_id } = request.params;

  if (!id || !program_id) {
    return reply.status(400).send({
      status_code: 400,
      trace_id: traceId,
      message: "Invalid parameters",
    });
  }
  try {
    const workLocation = await WorkLocationModel.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
      include: [
        {
          model: TimeZone,
          as: 'time_zones',
          attributes: ['id', 'name'],
        },
        {
          model: CountryModel,
          as: 'countries',
          attributes: ['id', 'name'],
        },
        {
          model: WorkLocationCurrency,
          as: 'currencies',
          attributes: ['currency_id', 'is_default'],
        },
      ],
    });

    if (!workLocation) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Work Location Not Found",
      });
    }

    const currencyIds = workLocation.currencies.map((currency: { currency_id: any; }) => currency.currency_id);

    const currencies = await Currencies.findAll({
      where: {
        id: currencyIds,
      },
      attributes: ['id', 'name'],
    });

    const responseCurrencies = workLocation.currencies.map((currency: { currency_id: any; is_default: any; }) => {
      const foundCurrency = currencies.find(curr => curr.id === currency.currency_id);
      return {
        id: currency.currency_id,
        name: foundCurrency ? foundCurrency.name : null,
        is_default: currency.is_default,
      };
    });

    const responseWorkLocation = {
      ...workLocation.dataValues,
      currencies: responseCurrencies,
    };

    return reply.status(200).send({
      status_code: 200,
      work_location: responseWorkLocation,
      trace_id: traceId,
    });

  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed To Retrieve Work Location",
      error,
    });
  }
}

export async function updateWorkLocation(
  request: FastifyRequest<{
    Params: { id: string };
    Body: WorkLocationInterface;
  }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params;
    const { program_id, currencies, ...updates } = request.body;

    if (!program_id) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "program_id is required in the request body",
      });
    }

    const [numRowsUpdated] = await WorkLocationModel.update(
      { ...updates, modified_on: Date.now() },
      { where: { id, program_id, is_deleted: false } }
    );

    if (numRowsUpdated === 0) {
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message: "Work Location Not Found",
      });
    }

    await WorkLocationCurrency.destroy({
      where: { work_location_id: id },
    });

    if (currencies && currencies.length > 0) {
      await Promise.all(
        currencies.map(async (currency: { id: any; is_default: any }) => {
          await WorkLocationCurrency.create({
            work_location_id: id,
            currency_id: currency.id,
            is_default: currency.is_default,
          });
        })
      );
    }

    return reply.status(200).send({
      status_code: 200,
      work_location_id: id,
      trace_id: traceId,
      message: "Work Location and currencies updated successfully",
    });
  } catch (error) {
    console.error("Error Updating Work Location:", error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error,
    });
  }
}

export async function deleteWorkLocationById(
  request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
  reply: FastifyReply
) {
  const traceId=generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const [numRowsDeleted] = await WorkLocationModel.update(
      {
        is_deleted: true,
        is_enabled: false,
        modified_on: Date.now(),
      },
      { where: { id, program_id, is_deleted: false } }
    );

    if (numRowsDeleted > 0) {
      reply.status(200).send({
        status_code: 200,
        work_location_id: id,
        trace_id:traceId,
        message: "Work Location Deleted Successfully",
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id:traceId,
        message: "Work Location Not Found"
      });
    }
  } catch (error) {
    console.error("Error Deleting Work Location:", error);
    reply.status(500).send({
      status_code: 500,
      trace_id:traceId,
      message: "Internal Server Error",
      error
    });
  }
}


export async function getAllWorkLocationsCountry(
  request: FastifyRequest<{ Params: { program_id: string }; Querystring: { isCountry?: string; isStates?: string } }>,
  reply: FastifyReply
) {

  const traceId = generateCustomUUID();
  const { program_id } = request.params;
  const { isCountry, isStates } = request.query;

  try {
    const includeOptions = [];
    const response: {
      status_code: number;
      trace_id: string;
      message: string;
      work_location_country?: { id: string; name: string }[];
      work_location_states?: { id: string; name: string }[];
    } = {
      status_code: 200,
      trace_id: traceId,
      message: "Work locations retrieved successfully",
    };

    if (isCountry === "true") {
      includeOptions.push({
        model: CountryModel,
        as: "countries",
        attributes: ["id", "name"],
      });
    }

    const workLocations = await WorkLocationModel.findAll({
      where: {
        program_id,
        is_deleted: false,
      },
      include: includeOptions,
      attributes: ["id", "name", "state_name"],
    });

    if (!workLocations || workLocations.length === 0) {
      response.message = "Work locations not found";
      return reply.status(200).send(response);
    }

    if (isCountry === "true") {
      const workLocationCountry = workLocations
        .map(location => location.countries).filter(Boolean).flat()
        .map((country: any) => ({
          id: country.id,
          name: country.name,
        }));

      response.work_location_country = workLocationCountry;

    }

    if (isStates === "true") {
      const workLocationStates = workLocations.map(location => ({
        id: location.id,
        name: location.state_name,
      }));

      response.work_location_states = workLocationStates;
    }

    return reply.status(200).send(response);
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to retrieve work locations",
      error
    });
  }
}