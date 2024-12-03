import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from '../utility/baseService';
import { ruleBuilderAttributes, RuleStatus } from '../interfaces/ruleBuilderInterface';
import ruleBuilderModel from '../models/ruleBuilderModel';
import { Op } from 'sequelize';
import RuleBuilderDecisionTable from '../models/ruleBuilderDecisionTableModel';
import RuleBuilderHierarchyMapping from '../models/ruleBuilderHierarchyMappingModel';
import Event from '../models/eventModel';
import hierarchies from '../models/hierarchiesModel';
import { sequelize } from '../config/instance';
import { Module } from '../models/moduleModel';
import Schema from '../models/schemaModel';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export async function getAllRules(
  request: FastifyRequest<{ Querystring: ruleBuilderAttributes }>,
  reply: FastifyReply
) {
  const { program_id } = request.params as { program_id: string };
  const query:any = request.query as ruleBuilderAttributes;
  try {
    await updateRulesAndMappings();
    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    delete query.page;
    delete query.limit;
    const offset = (page - 1) * limit;
    const totalCount = await ruleBuilderModel.count({
      where: { ...query, is_deleted: false, program_id }
    });
    const rows = await ruleBuilderModel.findAll({
      where: { ...query, is_deleted: false, program_id },
      limit: limit,
      offset: offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "name", "slug", "module_id"],
        },
        {
          model: hierarchies,
          as: "rule_hierarchies",
          attributes: ["id", "name", "is_enabled"],
        },
        {
          model: Module,
          as: "module",
          attributes: ["id", "name"],
        }
      ]
    });
    reply.status(200).send({
      status_code: 200,
      items_per_page: limit,
      rules: rows,
      total_count: totalCount,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      error: error,
    });
  }
}

async function getReferenceId(field: string) {
  const referenceRecord = await Schema.findOne({ where: { id: field } });
  return referenceRecord ? referenceRecord.id : null;
}

export async function createRule(
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply
) {
  const { program_id } = request.params;
  const trace_id = generateCustomUUID()
  const rulebuilder = request.body as ruleBuilderAttributes;
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Unauthorized - Token not found' });
  }

  const token = authHeader.split(' ')[1];
  let user: any = await decodeToken(token);

  if (!user) {
    return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
  }
  logger(
    {
      trace_id,
      actor: {
        user_name: user?.preferred_username,
        user_id: user?.sub,
      },
      data: request.body,
      eventname: "creating ruleBuilder",
      status: "success",
      description: `Creating ruleBuilder for ${program_id}`,
      level: 'info',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    },
    ruleBuilderModel
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(rulebuilder.effective_start_date ?? today.toISOString());
  startDate.setHours(0, 0, 0, 0);
  const endDate = rulebuilder.effective_end_date ? new Date(rulebuilder.effective_end_date) : null;
  if (endDate) {
    endDate.setHours(0, 0, 0, 0);
    if (endDate.getTime() === startDate.getTime()) {
      throw new Error("End Date Cannot Be The Same As The Start Date.");
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new Error("End Date Cannot Be Earlier Than The Start Date.");
    }
  }
  if (startDate.getTime() < today.getTime()) {
    throw new Error("Start Date Cannot Be Earlier Than Today.");
  }
  const isEnabled = startDate <= today && (!endDate || endDate >= today);
  const isActive = startDate > today;
  let result = isActive ? RuleStatus.Inactive : RuleStatus.Active;
  try {
    const existingRule = await ruleBuilderModel.findOne({
      where: {
        rule_name: rulebuilder.rule_name,
        program_id: program_id,
        effective_start_date: rulebuilder.effective_start_date,
        effective_end_date: rulebuilder.effective_end_date,
        is_deleted: false,
        module_id: rulebuilder.module_id,
        rule_event_id: rulebuilder.rule_event_id
      },
    });
    if (existingRule) {
      const existingStartDate = existingRule.effective_start_date ? new Date(existingRule.effective_start_date) : null;
      const existingEndDate = existingRule.effective_end_date ? new Date(existingRule.effective_end_date) : null;
      const newStartDate = rulebuilder.effective_start_date ? new Date(rulebuilder.effective_start_date) : null;
      const newEndDate = rulebuilder.effective_end_date ? new Date(rulebuilder.effective_end_date) : null;

      const allFieldsMatch = (
        existingRule.program_id === program_id &&
        existingStartDate?.getTime() === newStartDate?.getTime() &&
        (existingEndDate?.getTime() === newEndDate?.getTime()) &&
        JSON.stringify(existingRule.conditions?.sort()) === JSON.stringify(rulebuilder.conditions?.sort()) &&
        JSON.stringify(existingRule.actions?.sort()) === JSON.stringify(rulebuilder.actions?.sort()) &&
        JSON.stringify(existingRule.hierarchies?.sort()) === JSON.stringify(rulebuilder.hierarchies?.sort())
      );
      if (allFieldsMatch) {
        return reply.status(400).send({
          status_code: 400,
          message: `Rule with rule name: ${existingRule.rule_name} already exists!!`,
          trace_id,
        });
      }
    }
    const rule = await ruleBuilderModel.create({
      ...rulebuilder,
      program_id,
      is_enabled: isEnabled,
      status: result,
    });
    if (rulebuilder.hierarchies && Array.isArray(rulebuilder.hierarchies)) {
      for (const hierarchyId of rulebuilder.hierarchies) {
        await sequelize.models['rule-builder-hierarchy'].create({
          rule_id: rule.id,
          hierarchy_id: hierarchyId,
        });
      }
    }
    reply.status(201).send({
      status_code: 201,
      rule: {
        id: rule.id,
        rule_name: rule.rule_name,
      },
      trace_id,
    });
    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create ruleBuilder",
        status: "success",
        description: `create ruleBuilder for ${program_id} successfully`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      ruleBuilderModel
    );
    setImmediate(async () => {
      try {
        if (rulebuilder.conditions && Array.isArray(rulebuilder.conditions)) {
          for (const cond of rulebuilder.conditions) {
            const referenceId = await getReferenceId(cond.field_name);
            cond.reference = {
              table: 'schema',
              column: 'schema',
              id: referenceId || '',
            };
          }
        }

        if (rulebuilder.actions && Array.isArray(rulebuilder.actions)) {
          for (const act of rulebuilder.actions) {
            const referenceId = await getReferenceId(act.field);
            act.reference = {
              table: 'schema',
              column: 'schema',
              id: referenceId || '',
            };
          }
        }

        if (rulebuilder.hierarchies && Array.isArray(rulebuilder.hierarchies)) {
          for (const hierarchyId of rulebuilder.hierarchies) {
            await RuleBuilderHierarchyMapping.create({
              rule_id: rule.id,
              hierarchy_id: hierarchyId,
              is_enabled: isEnabled,
              is_deleted: false,
            });
          }
        }
      } catch (backgroundError) {
        console.error('Error Running Background Tasks:', backgroundError);
      }
    });
  } catch (error: any) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0].path;
      return reply.status(400).send({ error: `${field.value} already in use!`, trace_id });
    }
    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating ruleBuilder",
        status: "error",
        description: `faild to creating ruleBuilder for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      ruleBuilderModel
    );
    console.log('Error Creating Rule:', error);
    reply.status(500).send({
      message: 'An Error Occurred While Creating The Rule',
      error: error,
    });
  }
}

export async function getRuleById(
  request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id, program_id } = request.params;
    const rule = await ruleBuilderModel.findOne({
      where: { id, program_id },
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "name", "slug", "module_id"],
        },
        {
          model: hierarchies,
          as: "rule_hierarchies",
          attributes: ["id", "name", "is_enabled"],
        },
        {
          model: Module,
          as: "module",
          attributes: ["id", "name"],
        }
      ],
    });

    if (rule) {
      const ruleData = rule.get({ plain: true });
      const event_id = ruleData.rule_event_id;
      const module_id = ruleData.module_id;

      const schema = await Schema.findAll({
        where: {
          module_id: module_id,
          event_id: event_id
        }
      });

      const schemas = schema.map(s => s.get({ plain: true }));

      // Check if conditions exist before iterating
      if (ruleData.conditions && Array.isArray(ruleData.conditions)) {
        ruleData.conditions.forEach((condition: any) => {
          schemas.forEach((schema) => {
            const match = schema.ruleFieldInputConfigs.find(
              (config: Record<string, any>) => config.id === condition.field_name
            );
            if (match) {
              condition.field_name = match;
              if (match.ruleField && match.ruleField.ruleFieldOperator.length > 0) {
                const name = match.ruleField.ruleFieldOperator[0].operatorName.replace(/_/g, ' ');
                condition.condition_header_name = `${match.name} ${name}`;
              }
            }
          });
        });
      }

      // Check if actions exist before iterating
      if (ruleData.actions && Array.isArray(ruleData.actions)) {
        ruleData.actions.forEach((action: any) => {
          schemas.forEach((schema) => {
            const match = schema.ruleFieldOutputConfigs.find(
              (config: Record<string, any>) => config.id === action.field
            );
            if (match) {
              action.field = match;
            }
          });
        });
      }

      reply.status(200).send({
        status_code: 200,
        rule: ruleData, // Send the plain data, not the Sequelize object
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(404).send({ message: "Rule Not Found" });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({
      status_code: 500,
      message: "An Error Occurred While Fetching The Rule"
    });
  }
}

export const updateRuleById = async (
  request: FastifyRequest<{ Params: { id: string, program_id: string }, Body: ruleBuilderAttributes }>,
  reply: FastifyReply
) => {
  const { id, program_id } = request.params;
  const updatedPayload = request.body as ruleBuilderAttributes;

  try {
    const rule = await ruleBuilderModel.findOne({
      where: { id, program_id }
    });
    if (rule) {
      await rule.update(updatedPayload);

      reply.status(201).send({
        status_code: 201,
        rule: id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({ message: 'Rule Not Found' });
    }
  } catch (error) {
    reply.status(500).send({
      message: 'Failed To Update Rule',
      trace_id: generateCustomUUID(),
      error,
    });
  }
};

export const deleteRuleById = async (
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) => {
  const { id, program_id } = request.params;

  try {
    const rule = await ruleBuilderModel.findOne({
      where: { id, program_id }
    });
    if (rule) {
      await rule.update({ is_deleted: true, is_enabled: false, });
      reply.status(204).send({
        status_code: 204,
        rules: id,
        trace_id: generateCustomUUID(),
        message: 'Rule Is Delete'
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: 'Rule Not Found'
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Error Marking Rule As Deleted',
      error: error,
    });
  }
};

export async function searchRule(request: FastifyRequest, reply: FastifyReply) {
  await updateRulesAndMappings();
  const searchFields = ['id', ',rule_code', 'status', 'rule_name', 'module_id', 'rule_event_id', 'rule_type', 'updated_by'];
  const responseFields = ['id', 'rule_code', 'status', 'rule_name', 'module_id', 'rule_event_id', 'rule_type', 'updated_by'];
  return baseSearch(request, reply, ruleBuilderModel, searchFields, responseFields);
}

export async function updateRulesAndMappings() {
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  const transaction = await sequelize.transaction();
  try {
    const rulesToUpdate = await ruleBuilderModel.findAll({
      where: {
        effective_start_date: {
          [Op.eq]: formattedToday
        }
      },
      transaction
    });
    for (const ruleToUpdate of rulesToUpdate) {
      await ruleToUpdate.update({ is_enabled: true, status: RuleStatus.Active }, { transaction });
      await RuleBuilderDecisionTable.update(
        { is_enabled: true },
        {
          where: { rule_id: ruleToUpdate.id },
          transaction
        }
      );
      await RuleBuilderHierarchyMapping.update(
        { is_enabled: true },
        {
          where: { rule_id: ruleToUpdate.id },
          transaction
        }
      );
    }
    const rulesToUpdate2 = await ruleBuilderModel.findAll({
      where: {
        effective_end_date: {
          [Op.lt]: formattedToday
        }
      },
      transaction
    });
    for (const ruleToUpdate of rulesToUpdate2) {
      await ruleToUpdate.update({ is_enabled: false, status: RuleStatus.Expired }, { transaction });
      await RuleBuilderDecisionTable.update(
        { is_enabled: false },
        {
          where: { rule_id: ruleToUpdate.id },
          transaction
        }
      );
      await RuleBuilderHierarchyMapping.update(
        { is_enabled: false },
        {
          where: { rule_id: ruleToUpdate.id },
          transaction
        }
      );
    }
    await transaction.commit();
    console.log('Rules And Associated Mappings Updated Successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error Updating Rules And Mappings:', error);
  }
}
