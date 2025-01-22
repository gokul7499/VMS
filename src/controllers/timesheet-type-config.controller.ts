import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import { TimesheetTypeConfigInterface } from '../interfaces/timesheet-config.interface';
import TimesheetTypeConfig from '../models/timesheet-type-config.model';
import { sequelize } from '../config/instance';
import TimesheetExpenseRuleGroup from '../models/timesheet-expense-rule-group.model';
import FoundationalDataTypes from '../models/foundational-datatypes.model';
import IndustriesModel from '../models/labour-category.model';
import { QueryTypes } from 'sequelize';
import { timesheetConfigAdvancedFilter } from '../utility/queries';
import hierarchies from '../models/hierarchies.model';
import { decodeToken } from '../middlewares/verifyToken';

export const createTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const data = request.body as TimesheetTypeConfigInterface;

        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;
        console.log("uuu", userId)
        const existingConfig = await TimesheetTypeConfig.findOne({
            where: {
                program_id,
                title: data.title,
            },
        });

        if (existingConfig) {
            return reply.status(409).send({
                status_code: 409,
                trace_id: traceId,
                message: "Timesheet type config with the same name already exists."
            });
        }
        const newConfig = await TimesheetTypeConfig.create(
            {
                program_id, ...data, created_by: userId,
                modified_by: userId,
            },
        );
        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: 'Timesheet type config created successfully.',
            id: newConfig.id,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            traceId: traceId,
            message: 'Error while creating timesheet type config.',
            error: error.message,
        });
    }
};

export const getAllTimesheetTypeConfigs = async (
    request: FastifyRequest<{ Params: { program_id: string }; Querystring: { page?: string; limit?: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params;
        const { page = '1', limit = '10' } = request.query;

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const offset = (pageNumber - 1) * pageSize;

        const searchConditions: Record<string, any> = { is_deleted: false };
        if (program_id) searchConditions.program_id = program_id;

        const { rows: configs, count } = await TimesheetTypeConfig.findAndCountAll({
            where: searchConditions,
            limit: pageSize,
            offset,
            attributes: ['id', 'title', 'is_enabled', 'hierarchies', 'modified_on', 'timesheet_format', 'allocations', 'timesheet_rounding', 'break', 'labor_category'],
        });

        const hierarchyIds = [...new Set(configs.flatMap(config => config.hierarchies || []))];
        const laborIds = [...new Set(configs.flatMap(config => config.labor_category || []))];

        const [hierarchiesData, laborsData, ruleGroups] = await Promise.all([
            hierarchyIds.length ? hierarchies.findAll({ where: { id: hierarchyIds }, attributes: ['id', 'name'], }) : [],
            laborIds.length ? IndustriesModel.findAll({ where: { id: laborIds }, attributes: ['id', 'name'], }) : [],
            TimesheetExpenseRuleGroup.findAll({
                where: {
                    id: configs.map(config => config.allocations?.timesheet_rule_group).filter(Boolean)
                },
                attributes: ['id', 'rule_group_name'],
            })
        ]);

        const hierarchyMap = Object.fromEntries(hierarchiesData.map(hierarchy => [hierarchy.id, hierarchy.name]));
        const laborCategoryMap = Object.fromEntries(laborsData.map(labor => [labor.id, labor.name]));
        const ruleGroupMap = Object.fromEntries(ruleGroups.map(ruleGroup => [ruleGroup.id, ruleGroup]));

        const data = configs.map(config => ({
            ...config.toJSON(),
            hierarchies: (config.hierarchies || []).map((id: string | number) => ({ id, name: hierarchyMap[id] || null, })),
            labor_category: (config.labor_category || []).map((id: string | number) => ({ id, name: laborCategoryMap[id] || null, })),
            allocations: {
                ...config.allocations,
                timesheet_rule_group:
                    ruleGroupMap[config.allocations?.timesheet_rule_group] || null,
            },
        }));

        reply.status(200).send({
            status_code: 200,
            message: "Timesheet type config fetched successfully",
            trace_id: traceId,
            items_per_page: pageSize,
            current_page: pageNumber,
            total_records: count,
            data,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Error while fetching timesheet type configs.',
            error: error.message,
        });
    }
};

export const getTimesheetTypeConfigById = async (
    request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { id, program_id } = request.params;

        const config = await TimesheetTypeConfig.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id: traceId,
                config: []
            });
        }

        const hierarchyIds = config.hierarchies || [];
        const laborCategoryIds = config.labor_category || [];
        const ruleGroupId = config.allocations?.timesheet_rule_group;
        const masterDataTypeIds = config.allocations?.master_data_types?.value || [];

        const [hierarchiesData, laborCategories, ruleGroup, masterDataTypeValues] = await Promise.all([
            hierarchyIds.length > 0
                ? hierarchies.findAll({ where: { id: hierarchyIds }, attributes: ['id', 'name'] })
                : [],
            laborCategoryIds.length > 0
                ? IndustriesModel.findAll({ where: { id: laborCategoryIds }, attributes: ['id', 'name'] })
                : [],
            ruleGroupId
                ? TimesheetExpenseRuleGroup.findOne({ where: { id: ruleGroupId }, attributes: ['id', 'rule_group_name'] })
                : null,
            masterDataTypeIds.length > 0
                ? FoundationalDataTypes.findAll({ where: { id: masterDataTypeIds }, attributes: ['id', 'name'] })
                : [],
        ]);

        const data = {
            ...config.toJSON(),
            hierarchies: hierarchiesData.map(hierarchy => hierarchy.toJSON()),
            labor_category: laborCategories.map(category => category.toJSON()),
            allocations: {
                ...config.allocations,
                timesheet_rule_group: ruleGroup ? ruleGroup.toJSON() : null,
                master_data_types: {
                    value: masterDataTypeValues.map(data => data.toJSON()),
                    is_allow: config.allocations?.master_data_types?.is_allow || false,
                },
            }
        };

        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config found successfully.',
            config: data,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching Timesheet Type Config.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const updateTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
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
        const { id, program_id } = request.params as { id: string; program_id: string };
        const configData = request.body as TimesheetTypeConfigInterface;
        const config = await TimesheetTypeConfig.findOne({ where: { id, is_deleted: false } });
        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id: traceId,
                config: []
            });
        }
        await config.update({
            program_id,
            ...configData,
            modified_by: userId,
        });
        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating Timesheet Type Config.',
            error: error || 'Unknown error',
            trace_id: traceId,
        });
    }
};

export const deleteTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    let { name } = request.body as { name: string };
    name = name.trim();
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
        const { id } = request.params as { id: string };
        const config = await TimesheetTypeConfig.findOne({ where: { id, is_deleted: false } });

        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id: traceId,
            });
        }

        await config.update({ is_enabled: false, is_deleted: true, modified_by: userId, });

        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config deleted successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting Timesheet Type Config.',
            error: error,
            trace_id: traceId,
        });
    }
};

export async function timesheetTypeConfigFilter(
    request: FastifyRequest<{
      Params: { program_id: string };
      Body: {
        id?: string;
        title?: string;
        hierarchy_ids?: string[];
        labor_category?: string[];
        is_enabled?: boolean | string;
        allocation_method?: string;
        timesheet_rule_group?: string;
        timesheet_format?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const traceId = generateCustomUUID();
    try {
      const { program_id } = request.params;
      const {
        id,
        title,
        hierarchy_ids,
        labor_category,
        is_enabled,
        allocation_method,
        timesheet_rule_group,
        timesheet_format,
        page,
        limit,
      } = request.body;
  
  
      const isEnabledFilter =
        typeof is_enabled === 'string'
          ? is_enabled === 'true' ? 1 : 0
          : is_enabled === true ? 1 : is_enabled === false ? 0 : undefined;
  
      const pageNumber = parseInt(page ?? '1', 10);
      const limitNumber = parseInt(limit ?? '10', 10);
      const offset = (pageNumber - 1) * limitNumber;
  
      const query = timesheetConfigAdvancedFilter(
        Boolean(id),
        Boolean(title),
        hierarchy_ids || [],
        labor_category || [],
        Boolean(allocation_method),
        Boolean(timesheet_rule_group),
        Boolean(timesheet_format),
        isEnabledFilter !== undefined
      );
  
      const replacements: Record<string, any> = {
        program_id,
        id,
        title: title ? `%${title}%` : undefined,
        allocation_method,
        timesheet_rule_group,
        timesheet_format,
        limit: limitNumber,
        offset,
        is_enabled: isEnabledFilter,
      };
  
      hierarchy_ids?.forEach((hierarchyId, index) => {
        replacements[`hierarchy_id${index}`] = hierarchyId;
      });
      labor_category?.forEach((laborCategoryId, index) => {
        replacements[`labor_category_id${index}`] = laborCategoryId;
      });
  
      const data = await sequelize.query<{ total_count: any }>(query, {
        replacements,
        type: QueryTypes.SELECT,
      });
  
      const totalRecords = data.length > 0 ? data[0].total_count : 0;
  
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: data.length > 0 ? 'Timesheet Type Config fetched successfully.' : 'No records found.',
        total_records: totalRecords,
        page: pageNumber,
        limit: limitNumber,
        items: data,
      });
    } catch (error: any) {
      return reply.status(500).send({
        status_code: 500,
        message: 'Internal Server Error',
        trace_id: traceId,
        error: error.message,
      });
    }
  }

export const getAllRelatedDataByProgram = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params;
        const configs = await TimesheetTypeConfig.findAll({
            where: { program_id, is_deleted: false },
            attributes: ['hierarchies', 'labor_category', 'allocations'],
        });
        const hierarchyIds = [...new Set(configs.flatMap(config => config.hierarchies || []))];
        const laborIds = [...new Set(configs.flatMap(config => config.labor_category || []))];
        const ruleGroupIds = [
            ...new Set(
                configs
                    .flatMap(config => config.allocations?.timesheet_rule_group || [])
                    .filter(Boolean)
            ),
        ];
        const [hierarchiesData, laborsData, ruleGroupsData] = await Promise.all([
            hierarchyIds.length ? hierarchies.findAll({ where: { id: hierarchyIds }, attributes: ['id', 'name'] }) : [],
            laborIds.length ? IndustriesModel.findAll({ where: { id: laborIds }, attributes: ['id', 'name'] }) : [],
            ruleGroupIds.length
                ? TimesheetExpenseRuleGroup.findAll({
                    where: { id: ruleGroupIds },
                    attributes: ['id', 'rule_group_name'],
                })
                : [],
        ]);
        const data = {
            hierarchies: hierarchiesData.map(hierarchy => ({ id: hierarchy.id, name: hierarchy.name })),
            labor_categories: laborsData.map(labor => ({ id: labor.id, name: labor.name })),
            timesheet_rule_groups: ruleGroupsData.map(ruleGroup => ({
                id: ruleGroup.id,
                name: ruleGroup.rule_group_name,
            })),
        };
        reply.status(200).send({
            status_code: 200,
            message: "Dropdown data fetched successfully",
            trace_id: traceId,
            data,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Error while fetching related data.',
            error: error.message,
        });
    }
};
