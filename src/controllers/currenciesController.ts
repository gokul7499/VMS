import { FastifyRequest, FastifyReply } from 'fastify';
import Currencies from '../models/currenciesModel';
import currenciesData from '../interfaces/currenciesInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from '../utility/baseService';

export async function getCurrencies(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['name', 'symbol'];
  const responseFields = ['id', 'name', 'label', 'symbol', 'code'];
  return baseSearch(request, reply, Currencies, searchFields, responseFields);
}

export async function getCurrenciesById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params as { id: string };
    const currencies = await Currencies.findByPk(id);
    if (currencies) {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        data: currencies
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        currency: [],
        message: 'Currencies not found',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal Server Error",
      error
    });
  }
}

export async function createCurrencies(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { name, label, code, symbol } = request.body as currenciesData;
    const newItem = await Currencies.create({
      name,
      label,
      code,
      symbol,
    });
    reply.status(200).send({
      status_code: 200,
      message: 'Currencies create succesfully',
      trace_id: generateCustomUUID(),
      data: newItem
    });
  } catch (error) {
    reply.status(500).send({ message: 'An error occurred while creating currencies', error });
  }
}

export async function updateCurrencies(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { name, label, code, symbol } = request.body as currenciesData;

    const [numRowsUpdated] = await Currencies.update(
      { name, label, code, symbol },
      { where: { id } }
    );

    if (numRowsUpdated > 0) {
      reply.status(200).send({
        status_code: 200,
        message: 'Currencies updated successfully',
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'Currencies not found',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal Server Error",
      error
    });
  }
}

export async function deleteCurrencies(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const currencies = await Currencies.update({
      is_deleted: true,
    }, { where: { id } });
    if (currencies.length > 0) {
      reply.status(200).send({
        status_code: 200,
        message: 'Currencies deleted successfully',
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'Currencies not found',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal Server Error",
      error
    });
  }
}

export const bulkUploadCurrencies = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const currencies = request.body as any[];
    const createdCurrencies = await Currencies.bulkCreate(currencies);
    reply.status(201).send({
      status_code: 201,
      data: createdCurrencies,
      message: 'Currencies Created successfully',
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create Currencies',
      trace_id: generateCustomUUID(),
      error: error,
    });
  }
};
