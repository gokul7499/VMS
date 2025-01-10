import WorkLocationModel from "../models/work-location.model";
import { WorkLocationInterface } from "../interfaces/work-location.interface";
import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import Currencies from "../models/currencies.model";
import WorkLocationCurrency from "../models/workLocationCurrency.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from "sequelize";
import { getWorklocation } from "../utility/queries";
import { sequelize } from "../config/instance";
import CountryModel from "../models/countries.model";

export async function createWorkLocation(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const workLocation = request.body as WorkLocationInterface;
  const traceId = generateCustomUUID();
  const program_id = workLocation.program_id;

  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error("Unauthorized: Token not found or invalid");
}

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
  }

  const transaction = await sequelize.transaction();

  try {
    const [workLocationData, created] = await WorkLocationModel.findOrCreate({
      where: {
        program_id,
        [Op.or]: [
          { code: workLocation.code },
          { name: workLocation.name },
        ],
      },
      defaults: { ...workLocation },
      transaction,
    });

    if (!created) {
      const existingWorkLocation = await WorkLocationModel.findOne({
        where: {
          program_id,
          [Op.or]: [
            { code: workLocation.code },
            { name: workLocation.name },
          ],
        },
        attributes: ['code', 'name'],
        transaction,
      });

      const duplicateField = 
        existingWorkLocation?.name === workLocation.name
          ? 'name'
          : 'code';

      await transaction.rollback();

      return reply.status(400).send({
        status_code: 400,
        message: `Work location with ${duplicateField} '${workLocation[duplicateField]}' already exists.`,
        trace_id: traceId,
      });
    }

    if (workLocation.currencies && workLocation.currencies.length > 0) {
      for (const currency of workLocation.currencies) {
        await WorkLocationCurrency.create({
          work_location_id: workLocationData.id,
          currency_id: currency.id,
          is_default: currency.is_default,
          name: currency.name,
          code: currency.code,
        }, { transaction });
      }
    }

    await transaction.commit();

    reply.status(201).send({
      status_code: 201,
      message: "Work location created successfully",
      workLocation: workLocationData.id,
      trace_id: traceId,
    });

  } catch (error: any) {
    await transaction.rollback();

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
      error: error.message,
    });
  }
} 


export async function getAllWorkLocations(
  request: FastifyRequest<{ Querystring: WorkLocationInterface }>,
  reply: FastifyReply
) {
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
    if (query.name) {
      whereClause.name = { [Op.like]: `%${query.name}%` };
    }
    if(query.code){
      whereClause.code=query.code
    }
    if(query.zipcode){
      whereClause.zipcode=query.zipcode
    }
    if (query.modified_on) {
      const dateRange = query.modified_on.split(',');
      if (dateRange.length === 2) {
          const startDate = parseFloat(dateRange[0].trim());
          const endDate = parseFloat(dateRange[1].trim());
          whereClause.modified_on = { [Op.between]: [startDate, endDate] };
      }
  }
    const workLocations = await WorkLocationModel.findAll({
      where: whereClause,
      limit,
      offset,
      order,
      include: [
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
        trace_id: generateCustomUUID(),
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
      trace_id: generateCustomUUID(),
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
      where: { id, program_id, is_deleted: false },
      include: [
        {
          model: CountryModel,
          as: 'countries',
          attributes: ['id', 'name'],
        }
      ],
    });

    if (!workLocation) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Work Location Not Found",
      });
    }
    const workLocationCurrencies = await WorkLocationCurrency.findAll({
      where: { work_location_id: id },
      attributes: ['name', 'is_default','code'],
    });
    const responseCurrencies = workLocationCurrencies
      .filter((currency: any) => currency.name && currency.is_default !== undefined && currency.code);
    const responseWorkLocation = {
      ...workLocation.dataValues,
      currencies: responseCurrencies,
    };

    return reply.status(200).send({
      status_code: 200,
      work_location: responseWorkLocation,
      trace_id: traceId,
    });
  } catch (error: any) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed To Retrieve Work Location",
      error: error.message,
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
        currencies.map(async (currency: {
          name: unknown; id: any; is_default: any,code:any 
}) => {
          await WorkLocationCurrency.create({
            work_location_id: id,
            currency_id: currency.id,
            is_default: currency.is_default,
            name:currency.name,
            code:currency.code
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
        trace_id: generateCustomUUID(),
        message: "Work Location Deleted Successfully",
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: "Work Location Not Found"
      });
    }
  } catch (error) {
    console.error("Error Deleting Work Location:", error);
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
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

type QueryResult = {
  program_id: string;
  countries: Array<{ id: string; name: string }> | null;
};

export async function getAllCountry(
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params;

  try {
    const result = await sequelize.query<QueryResult>(getWorklocation,
      {
        type: QueryTypes.SELECT,
        replacements: { program_id },
      }
    );
    if (!result || result.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Work Location Not Found",
      });
    }
    const countries = result[0]?.countries || [];

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Work Locations retrieved successfully",
      countries,
    });
  } catch (error) {
    console.error("Error Fetching Work Locations:", error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error,
    });
  }
}