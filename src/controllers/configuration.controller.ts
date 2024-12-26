import { FastifyRequest, FastifyReply } from "fastify";
import Configuration from "../models/configuration.model";
import { ConfigurationAttributes } from "../interfaces/configuration.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import generateSlug from '../plugins/slugGenerate';

export const getConfigurations = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const configurations = await Configuration.findAll({ order: [["sr_Number", "ASC"]] });
    if (configurations.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Configuration data not found",
        configurations: [],
        trace_id: traceId,
      });
    }
    reply.status(200).send({
      status_code: 200,
      message: "Data fetch successfully",
      configurations: configurations,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Failed to fetch configurations",
      trace_id: traceId,
    });
  }
};

export const getConfigurationById = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { id } = request.params as { id: string };
  const configuration = await Configuration.findByPk(id);
  if (configuration) {
    reply.status(200).send({
      status_code: 200,
      message: "Data fetch successfully",
      configurations: configuration,
      trace_id: traceId,
    });
  } else {
    reply.status(200).send({
      status_code: 200,
      message: "Configuration data not found",
      configuration: [],
      trace_id: traceId,
    });
  }
};

export const createConfiguration = async (request: FastifyRequest, reply: FastifyReply) => {
  const configData = request.body as Partial<ConfigurationAttributes>;
  const traceId = generateCustomUUID();
  try {
    const key = generateSlug(configData.title ?? '', {
      lowercase: true,
      trim: true,
      removedspecial: true,
    });

    if (configData.config_model) {
      configData.config_model = configData.config_model.toLowerCase();
    }

    if (configData.key) {
      configData.key = configData.key.toLowerCase();
    }

    const newConfiguration: any = await Configuration.create({ ...configData, key });

    reply.status(201).send({
      status_code: 201,
      message: "Configuration data created successfully",
      configuration: newConfiguration?.id,
      trace_id: traceId,
    });

  } catch (error) {
    console.log(error);
    reply.status(500).send({
      status_code: 500,
      message: "Failed to create configuration",
      trace_id: traceId,
    });
  }
};

export const updateConfiguration = async (request: FastifyRequest, reply: FastifyReply) => {
  const trace_Id = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const configData = request.body as Partial<ConfigurationAttributes>;
    const configuration: any = await Configuration.findByPk(id);
    if (configuration) {
      await configuration.update(configData);
      reply.status(201).send({
        status_code: 201,
        message: "Configuration data update successfully",
        configuration: configuration?.id,
        trace_id: trace_Id,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Configuration not found",
        trace_id: trace_Id,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Failed to update configuration",
      trace_id: trace_Id,
      error: error,
    });
  }
};

export const deleteConfiguration = async (request: FastifyRequest, reply: FastifyReply) => {
  const trace_Id = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const configuration = await Configuration.findByPk(id);
    if (configuration) {
      await configuration.update({
        is_deleted: true,
        is_enabled: false,
      });
      reply.status(204).send({
        status_code: 204,
        message: "Configuration data deleted successfully",
        trace_id: trace_Id,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Configuration not found",
        trace_id: trace_Id,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Failed to delete configuration",
      trace_id: trace_Id,
      error: error,
    });
  }
};
