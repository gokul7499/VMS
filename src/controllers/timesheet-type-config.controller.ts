import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import TimesheetTypeLaborCategorys from '../models/timesheet-type-labor-categorys.model';
import { TimesheetTypeConfigInterface } from '../interfaces/timesheet-config.interface';
import TimesheetTypeHierarchies from '../models/timesheet-type-hierarchies.model';
import TimesheetTypeConfig from '../models/timesheet-type-config.model';
import TimesheetMasterData from '../models/timesheet-type-master-data.Model';
import { sequelize } from '../config/instance';
import TimesheetExpenseRuleGroup from '../models/timesheet-expense-rule-group.model';
import Hierarchies from '../models/hierarchies.model';
import FoundationalDataTypes from '../models/foundational-datatypes.model';
import IndustriesModel from '../models/labour-category.model';
import { QueryTypes } from 'sequelize';
import { timesheetConfigAdvancedFilter } from '../utility/queries';

export const createTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const transaction = await TimesheetTypeConfig.sequelize?.transaction();
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { labor_categories , hierarchies, master_data_types, program_id: _ignoredProgramId, ...data } = request.body as any;
        const newConfig = await TimesheetTypeConfig.create(
            { program_id, ...data },
            { transaction }
        );
        if (Array.isArray(labor_categories ) && labor_categories .length > 0) {
            await TimesheetTypeLaborCategorys.bulkCreate(
                labor_categories .map(laborCategory => ({
                    timesheet_type_config_id: newConfig.id,
                    labor_category_id: laborCategory,
                })),
                { transaction }
            );
        }
        if (Array.isArray(hierarchies) && hierarchies.length > 0) {
            await TimesheetTypeHierarchies.bulkCreate(
                hierarchies.map(hierarchy => ({
                    timesheet_type_config_id: newConfig.id,
                    hierarchy_id: hierarchy,
                })),
                { transaction }
            );
        }
        if (master_data_types?.value && Array.isArray(master_data_types.value)) {
            await TimesheetMasterData.bulkCreate(
                master_data_types.value.map((masterDataId: any) => ({
                    timesheet_type_config_id: newConfig.id,
                    value: masterDataId,
                    is_allow: master_data_types.is_allow,
                })),
                { transaction }
            );
        }
        await transaction?.commit();
        reply.status(201).send({
            status_code: 201,
            id: newConfig.id,
            message: 'Timesheet Type Config created successfully.',
            trace_id:traceId,
        });
    } catch (error: any) {
        await transaction?.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating Timesheet Type Config.',
            error: error.message || error,
            trace_id:traceId,
        });
    }
};

export const getAllTimesheetTypeConfigs = async (
    request: FastifyRequest<{Params: { program_id: string }; Querystring: { page?: number; limit?: number };}>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params;
        const { page = 1, limit = 10 } = request.query;
        const sanitizedPage = Math.max(Number(page), 1);
        const sanitizedLimit = Math.max(Number(limit), 1);
        const offset = (sanitizedPage - 1) * sanitizedLimit;
        const searchConditions: Record<string, any> = { is_deleted: false };
        if (program_id) searchConditions.program_id = program_id;
        const { rows: configs, count } = await TimesheetTypeConfig.findAndCountAll({
            where: searchConditions,
            limit: sanitizedLimit,
            offset,
        });
        const configIds = configs.map((config) => config.id);
        const hierarchyRelations = await TimesheetTypeHierarchies.findAll({
            where: { timesheet_type_config_id: configIds },
            include: [
                {
                    model: Hierarchies,
                    as: 'hierarchies',
                    attributes: ['id', 'name'],
                },
            ],
        });
        const hierarchiesMap = hierarchyRelations.reduce((acc: Record<string, any[]>, relation) => {
            const configId = relation.timesheet_type_config_id;
            acc[configId] = acc[configId] || [];
            if (relation.hierarchies) acc[configId].push(relation.hierarchies);
            return acc;
        }, {});
        const laborRelations = await TimesheetTypeLaborCategorys.findAll({
            where: { timesheet_type_config_id: configIds },
            include: [
                {
                    model: IndustriesModel,
                    as: 'labor_categorys',
                    attributes: ['id', 'name'],
                },
            ],
        });
        const labourCategoryMap = laborRelations.reduce((acc: Record<string, any[]>, relation) => {
            const configId = relation.timesheet_type_config_id;
            acc[configId] = acc[configId] || [];
            if (relation.labor_categorys) acc[configId].push(relation.labor_categorys);
            return acc;
        }, {});
        const ruleGroupIds = configs
            .map((config) => config.allocations?.timesheet_rule_group_association)
            .filter(Boolean);
        const ruleGroups = await TimesheetExpenseRuleGroup.findAll({
            where: { id: ruleGroupIds },
            attributes: ['id', 'rule_group_name'],
        });
        const ruleGroupMap = ruleGroups.reduce((acc: Record<string, any>, ruleGroup) => {
            acc[ruleGroup.id] = ruleGroup;
            return acc;
        }, {});

        const data = configs.map((config) => ({
            ...config.toJSON(),
            hierarchies: hierarchiesMap[config.id] || [],
            labour_category: labourCategoryMap[config.id] || [],
            allocations: {
                ...config.allocations,
                timesheet_rule_group_association: ruleGroupMap[config.allocations?.timesheet_rule_group_association] || null,
            },
        }));
        reply.status(200).send({
            status_code: 200,
            message:" Timesheet Type Configs Retrieved Successfully",
            items_per_page: sanitizedLimit,
            total_records: count,
            data,
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching Timesheet Type Configs.',
            error: error || 'Unknown error',
            trace_id:traceId,
        });
    }
};


export const getTimesheetTypeConfigById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const config = await TimesheetTypeConfig.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id:traceId,
            });
        }
        const timesheetHierarchies = await TimesheetTypeHierarchies.findAll({
            where: { timesheet_type_config_id: id },
            include: [
                {
                    model: Hierarchies,
                    as: 'hierarchies',
                    attributes: ['id', 'name'],
                },
            ],
        });
        const hierarchyData = timesheetHierarchies
            .map(item => item.hierarchies)
            .filter(hierarchy => hierarchy);
        const timesheetMasterDatas = await TimesheetMasterData.findAll({
            where: { timesheet_type_config_id: id },
            include: [
                {
                    model: FoundationalDataTypes,
                    as: 'master_data',
                    attributes: ['id', 'name'],
                },
            ],
        });
        const masterDataMap = new Map();
        timesheetMasterDatas.forEach(item => {
            const value = item.master_data ?
                (Array.isArray(item.master_data) ?
                    item.master_data.map(data => ({ id: data.id, name: data.name })) :
                    [{ id: item.master_data.id, name: item.master_data.name }]
                ) : [];

            const isAllow = item.is_allow;
            if (!masterDataMap.has(isAllow)) {
                masterDataMap.set(isAllow, { value: [], is_allow: isAllow });
            }
            masterDataMap.get(isAllow).value.push(...value);
        });
        const masterData = Array.from(masterDataMap.values());
        const timesheetLaborCategorys = await TimesheetTypeLaborCategorys.findAll({
            where: { timesheet_type_config_id: id },
            include: [
                {
                    model: IndustriesModel,
                    as: 'labor_categorys',
                    attributes: ['id', 'name'],
                },
            ],
        });
        const laborCategoryData = timesheetLaborCategorys
            .map(item => item.labor_categorys)
            .filter(labor_categorys => labor_categorys);
        const data = {
            ...config.toJSON(),
            hierarchies: hierarchyData,
            labor_categorys: laborCategoryData,
            master_data: masterData,
        };
        reply.status(200).send({
            status_code: 200,
            config: data,
            trace_id:traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching Timesheet Type Config.',
            error: error.message || 'Unknown error',
            trace_id:traceId,
        });
    }
};

export const updateTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    try {
        const { id } = request.params as { id: string };
        const { program_id, labor_categorys, hierarchies, master_data_types, ...configData } = request.body as {
            program_id?: string;
            labor_categorys?: string[];
            hierarchies?: string[];
            master_data_types?: { value: string[]; is_allow: boolean };
        } & TimesheetTypeConfigInterface;
        const config = await TimesheetTypeConfig.findOne({ where: { id, is_deleted: false } });
        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id:traceId,
            });
        }
        await config.update({
            program_id,
            ...configData
        }, { transaction });

        await config.update({ program_id }, { transaction });
        if (Array.isArray(labor_categorys)) {
            await TimesheetTypeLaborCategorys.destroy({ where: { timesheet_type_config_id: id }, transaction });
            if (labor_categorys.length > 0) {
                await TimesheetTypeLaborCategorys.bulkCreate(
                    labor_categorys.map(laborCategory => ({
                        timesheet_type_config_id: id,
                        labor_category_id: laborCategory,
                    })),
                    { transaction }
                );
            }
        }
        if (Array.isArray(hierarchies)) {
            await TimesheetTypeHierarchies.destroy({ where: { timesheet_type_config_id: id }, transaction });
            if (hierarchies.length > 0) {
                await TimesheetTypeHierarchies.bulkCreate(
                    hierarchies.map(hierarchy => ({
                        timesheet_type_config_id: id,
                        hierarchy_id: hierarchy,
                    })),
                    { transaction }
                );
            }
        }
        if (master_data_types?.value && Array.isArray(master_data_types.value)) {
            await TimesheetMasterData.destroy({ where: { timesheet_type_config_id: id }, transaction });
            if (master_data_types.value.length > 0) {
                await TimesheetMasterData.bulkCreate(
                    master_data_types.value.map(masterDataId => ({
                        timesheet_type_config_id: id,
                        value: masterDataId,
                        is_allow: master_data_types.is_allow,
                    })),
                    { transaction }
                );
            }
        }
        await transaction.commit();
        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config updated successfully.',
            trace_id:traceId,
        });
    } catch (error) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating Timesheet Type Config.',
            error: error || 'Unknown error',
            trace_id:traceId,
        });
    }
};

export const deleteTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
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

        await config.update({ is_deleted: true });

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
            created_on?: number[];
            modified_on?: number[];
            is_enabled?: boolean | string;
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
            created_on,
            modified_on,
            is_enabled,
            page,
            limit,
        } = request.body;

        let startDate: number | undefined;
        let endDate: number | undefined;
        let newStartDate: number | undefined;
        let newEndDate: number | undefined;

        if (created_on?.length === 2) {
            [startDate, endDate] = created_on;
        }
        if (modified_on?.length === 2) {
            [newStartDate, newEndDate] = modified_on;
        }

        const isEnabledFilter =
            typeof is_enabled === "string"
                ? is_enabled === "true" ? 1 : 0
                : is_enabled === true ? 1 : is_enabled === false ? 0 : undefined;

        const pageNumber = parseInt(page ?? "1", 10);
        const limitNumber = parseInt(limit ?? "10", 10);
        const offset = (pageNumber - 1) * limitNumber;

        const query = timesheetConfigAdvancedFilter(
            Boolean(id),
            Boolean(title),
            hierarchy_ids || [],
            labor_category || [],
            startDate,
            endDate,
            newStartDate,
            newEndDate,
            isEnabledFilter !== undefined
        );

        const replacements: Record<string, any> = {
            program_id,
            id,
            title: title ? `${title}%` : undefined,
            limit: limitNumber,
            offset,
            startDate,
            endDate,
            newStartDate,
            newEndDate,
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
            trace_id:traceId,
            message: data.length > 0 ? "Timesheet Type Config fetched successfully." : "No records found.",
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            items: data
        });
    } catch (error: any) {
        console.error("Error in timesheetTypeConfigFilter:", error);
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id:traceId,
            error: error.message,
        });
    }
}