import { FastifyRequest, FastifyReply } from 'fastify';
import ProgramModule from '../models/programModuleModel';
import generateCustomUUID from '../utility/genrateTraceId';
import { Module } from '../models/moduleModel';
import { Op } from 'sequelize';

export const getProgramModuleById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  try {
    const programData: any = await ProgramModule.findOne({
      where: { program_id: id },
      attributes: {
        exclude: ['is_deleted', 'created_on', 'modified_on', 'created_by', 'modified_by']
      },
    });

    if (!programData) {
      return reply.status(200).send({
        status_code: 200,
        message: 'Data not found',
        trace_id: generateCustomUUID(),
      });
    }

    const moduleIds = programData.modules.map((module: any) => module.module_id);
    const modulesData = await Module.findAll({
      where: {
        id: {
          [Op.in]: moduleIds,
        },
        is_enabled: true
      },
      attributes: ['id', 'name', 'description']
    });

    const moduleMap = modulesData.reduce((acc: any, module: any) => {
      acc[module.id] = module;
      return acc;
    }, {});

    const transformedModules = programData.modules.map((module: any) => ({
      module_id: moduleMap[module.module_id],
      is_enabled: module.is_enabled,
    }));

    const program = {
      ...programData.toJSON(),
      modules: transformedModules,
    };

    reply.send({
      status_code: 200,
      data: program,
      trace_id: generateCustomUUID()
    });
  } catch (error) {
    console.log(error);

    return reply.status(500).send({ error });
  }
};

export const getProgramModuleByIdAndQuery = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  try {
    // Fetch the program data based on program_id
    const programData: any = await ProgramModule.findOne({
      where: { program_id: id },
      attributes: {
        exclude: ['is_deleted', 'created_on', 'modified_on', 'created_by', 'modified_by']
      },
    });

    if (!programData) {
      return reply.status(200).send({
        status_code: 200,
        message: 'Data not found',
        trace_id: generateCustomUUID(),
      });
    }

    const moduleIds = programData.modules.map((module: any) => module.module_id);

    // Fetch modules where is_rule=true from Module table
    const modulesData = await Module.findAll({
      where: {
        id: {
          [Op.in]: moduleIds,
        },
        is_rule: true,
        is_enabled: true
      },
      attributes: ['id', 'name', 'description'],
    });

    // Map the fetched modules by their ID for quick lookup
    const moduleMap = modulesData.reduce((acc: any, module: any) => {
      acc[module.id] = module;
      return acc;
    }, {});

    // Filter and transform the programData.modules to include only those with is_rule=true
    const transformedModules = programData.modules
      .filter((module: any) => moduleMap[module.module_id]) // Only include modules that match is_rule=true
      .map((module: any) => ({
        module_id: moduleMap[module.module_id], // Include only matched modules with their full data
        is_enabled: module.is_enabled,          // Include the is_enabled status from programData
      }));

    // Construct the response object
    const programResponse = {
      id: programData.id,
      program_id: programData.program_id,
      modules: transformedModules,
    };

    reply.send({
      status_code: 200,
      data: programResponse,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    console.log(error);
    return reply.status(500).send({ error });
  }
};

export const getProgramModuleByProgramId = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };

  try {
    const programData: any = await ProgramModule.findOne({
      where: { program_id: program_id },
      attributes: {
        exclude: ['is_deleted', 'created_on', 'modified_on', 'created_by', 'modified_by'],
      },
    });

    if (!programData) {
      return reply.status(200).send({
        status_code: 200,
        message: 'Data not found',
        trace_id: generateCustomUUID(),
      });
    }

    const moduleIds = programData.modules.map((module: any) => module.module_id);

    const modulesData = await Module.findAll({
      where: {
        id: {
          [Op.in]: moduleIds,
        },
        is_enabled: true,
      },
      attributes: ['id', 'name', 'is_enabled', 'module_linking'],
      order: [['name', 'ASC']],
    });

    const transformedModules = modulesData.map((module: any) => ({
      id: module.id,
      name: module.name,
      is_enabled: module.is_enabled,
      module_linking: module.module_linking,
    }));

    return reply.send({
      statusCode: 200,
      modules: transformedModules,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    console.log(error);
    return reply.status(500).send({ error });
  }
};


export const getProgramModuleByIdAndQueryForWorkFlow = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  try {
    const programData: any = await ProgramModule.findOne({
      where: { program_id: id },
      attributes: {
        exclude: ['is_deleted', 'created_on', 'modified_on', 'created_by', 'modified_by']
      },
    });

    if (!programData) {
      return reply.status(200).send({
        status_code: 200,
        message: 'Data not found',
        trace_id: generateCustomUUID(),
      });
    }

    const moduleIds = programData.modules.map((module: any) => module.module_id);
    const modulesData = await Module.findAll({
      where: {
        id: {
          [Op.in]: moduleIds,
        },
        is_workflow: true,
        is_enabled: true
      },
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']],
    });

    // Map the fetched modules by their ID for quick lookup
    const moduleMap = modulesData.reduce((acc: any, module: any) => {
      acc[module.id] = module;
      return acc;
    }, {});

    // Filter and transform the programData.modules to include only those with is_workflow=true
    const transformedModules = programData.modules
      .filter((module: any) => moduleMap[module.module_id]) // Only include modules that match is_workflow=true
      .map((module: any) => ({
        module_id: moduleMap[module.module_id], // Include only matched modules with their full data
        is_enabled: module.is_enabled,          // Include the is_enabled status from programData
      }))
      .sort((a: any, b: any) => a.module_id.name.localeCompare(b.module_id.name)); // Sort alphabetically by 'name'

    // Construct the response object
    const programResponse = {
      id: programData.id,
      program_id: programData.program_id,
      modules: transformedModules,
    };

    reply.send({
      status_code: 200,
      data: programResponse,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    console.log(error);
    return reply.status(500).send({ error });
  }
};
