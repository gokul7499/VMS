import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import TimesheetTypeLaborCategorys from '../models/timesheet-type-labor-categorys.model';
import { TimesheetTypeConfigInterface } from '../interfaces/timesheet-config.interface';
import TimesheetTypeHierarchies from '../models/timesheet-type-hierarchies.model';
import TimesheetTypeConfig from '../models/timesheet-type-config.model';
import hierarchies from '../models/hierarchiesModel';
import IndustriesModel from '../models/industriesModel';
import TimesheetMasterData from '../models/timesheet-type-master-data.Model';
import FoundationalDataTypes from '../models/foundationalDatatypesModel';
import { sequelize } from '../config/instance';

export const createTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const transaction = await TimesheetTypeConfig.sequelize?.transaction();
    const trace_id = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { labor_categorys, hierarchies, master_data_types, program_id: _ignoredProgramId, ...data } = request.body as any;
        const newConfig = await TimesheetTypeConfig.create(
            { program_id, ...data },
            { transaction }
        );
        if (Array.isArray(labor_categorys) && labor_categorys.length > 0) {
            await TimesheetTypeLaborCategorys.bulkCreate(
                labor_categorys.map(laborCategory => ({
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
            trace_id,
        });
    } catch (error: any) {
        await transaction?.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating Timesheet Type Config.',
            error: error.message || error,
            trace_id,
        });
    }
};

export const getAllTimesheetTypeConfigs = async (
    request: FastifyRequest<{ Params: { program_id: string }; Querystring: { page?: number; limit?: number } }>,
    reply: FastifyReply
) => {
    const trace_id = generateCustomUUID();

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
                    model: hierarchies,
                    as: 'hierarchies',
                    attributes: ['id', 'name'],
                },
            ],
        });
        const hierarchiesMap = hierarchyRelations.reduce((acc: any, relation: any) => {
            const configId = relation.timesheet_type_config_id;
            if (!acc[configId]) acc[configId] = [];
            if (relation.hierarchies) acc[configId].push(relation.hierarchies);
            return acc;
        }, {});
        const data = configs.map((config) => ({
            ...config.toJSON(),
            hierarchies: hierarchiesMap[config.id] || [],
        }));
        reply.status(200).send({
            status_code: 200,
            items_per_page: sanitizedLimit,
            total_records: count,
            data,
            trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error fetching Timesheet Type Configs.',
            error: error || 'Unknown error',
            trace_id,
        });
    }
};


export const getTimesheetTypeConfigById = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const config = await TimesheetTypeConfig.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id,
            });
        }
        const timesheetHierarchies = await TimesheetTypeHierarchies.findAll({
            where: { timesheet_type_config_id: id },
            include: [
                {
                    model: hierarchies,
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
            trace_id,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching Timesheet Type Config.',
            error: error.message || 'Unknown error',
            trace_id,
        });
    }
};

export const updateTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    const transaction = await sequelize.transaction();
    try {
        const { id } = request.params as { id: string };
        const { program_id, labor_categorys, hierarchies, master_data_types ,...configData} = request.body as {
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
                trace_id,
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
            trace_id,
        });
    } catch (error) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating Timesheet Type Config.',
            error: error || 'Unknown error',
            trace_id,
        });
    }
};

export const deleteTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const config = await TimesheetTypeConfig.findOne({ where: { id, is_deleted: false } });

        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id: trace_id,
            });
        }

        await config.update({ is_deleted: true });

        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config deleted successfully.',
            trace_id: trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error deleting Timesheet Type Config.',
            error: error,
            trace_id: trace_id,
        });
    }
};
