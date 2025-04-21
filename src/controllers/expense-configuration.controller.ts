import { FastifyRequest, FastifyReply } from "fastify";
import ExpenseConfigurationModel from "../models/expense-configuration.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { ExpenseConfigurationAttributes, HierarchyId, createExpenseConfigurationSchema } from "../interfaces/expense-configuration.interfaces";
import { QueryTypes, Op, Sequelize } from 'sequelize';
import { sequelize } from "../config/instance";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";
import FoundationalDataTypes from "../models/foundational-datatypes.model";
import ExpenseTypeMapping from "../models/expense-config-expense-type-mapping.model";
import Hierarchies from "../models/hierarchies.model";
import IndustriesModel from "../models/labour-category.model";
import ExpenseTypeModel from "../models/expense-type.model";
import { count } from "console";
import { getAllExpenseConfigHierarchies, getExpenseByHierarchy, getExpenseConfigurationQuery } from "../repositories/expense-config.repository";

export async function getExpenseConfigurations(
    request: FastifyRequest<{
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, name, is_enabled, updated_on, hierarchy_ids,
        } = request.query as { page?: number; limit?: number; name?: string; is_enabled?: string | boolean; updated_on?: string; hierarchy_ids?: string; expense_type_ids?: string; };
        const offset = (page - 1) * limit;
        const whereCondition: any = {
            program_id,
            is_deleted: false,
            latest: true,
        };
        if (name) whereCondition.name = name;
        if (is_enabled !== undefined) whereCondition.is_enabled = is_enabled === "true";
        if (updated_on) {
            const dateRange = updated_on.split(',').map(date => new Date(date.trim()));
            if (dateRange.length === 2 && !isNaN(dateRange[0].getTime()) && !isNaN(dateRange[1].getTime())) {
                whereCondition.updated_on = { [Op.between]: [dateRange[0].toISOString(), dateRange[1].toISOString()] };
            }
        }
        if (hierarchy_ids) {
            const ids = hierarchy_ids.split(',').map(id => id.trim());
            whereCondition[Op.and] = ids.map(id =>
                Sequelize.where(
                    Sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '["${id}"]')`),
                    true
                )
            );
        }
        const { count, rows: expenseConfigList } = await ExpenseConfigurationModel.findAndCountAll({
            where: whereCondition,
            offset,
            limit,
            order: [['created_on', 'DESC']],
        });
        const populatedExpenseConfig = await Promise.all(
            expenseConfigList.map(async (config) => {
                const configJSON = config.toJSON();
                const hierarchyIds = Array.isArray(configJSON.hierarchy_ids) ? configJSON.hierarchy_ids : [];
                let hierarchyDetails: { id: any; name: any }[] = [];
                if (hierarchyIds.length > 0) {
                    const hierarchies = await Hierarchies.findAll({
                        where: { id: { [Op.in]: hierarchyIds } },
                        attributes: ['id', 'name'],
                    });
                    hierarchyDetails = hierarchies.map((h: any) => ({
                        id: h.id,
                        name: h.name,
                    }));
                }
                return {
                    ...configJSON,
                    hierarchy_ids: hierarchyDetails,
                };
            })
        );
        reply.status(200).send({
            status_code: 200,
            message: populatedExpenseConfig.length > 0
                ? 'Expense configuration fetched successfully.'
                : 'No expense configuration found.',
            trace_id: traceId,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            data: populatedExpenseConfig,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: (error as Error).message,
        });
    }
}

export async function getExpenseConfigurationById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const query = getExpenseConfigurationQuery(program_id, id);
        const [expenseConfig] = await sequelize.query(query, {
            replacements: { program_id, id },
            type: QueryTypes.SELECT,
        }) as [{ [key: string]: any }];
        if (!expenseConfig) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Expense configuration not found.',
                trace_id: traceId,
                expense_config: [],
            });
        }
        const parseJsonSafely = (value: any): any[] => {
            try {
                return typeof value === 'string' ? JSON.parse(value) : value || [];
            } catch {
                return [];
            }
        };
        const convertExpenseConfigBooleans = (config: any) => {
            return {
                ...config,
                is_enabled: Boolean(config.is_enabled),
                is_mdt_enabled: Boolean(config.is_mdt_enabled),
                is_projects_enabled: Boolean(config.is_projects_enabled),
                is_thresholds_enabled: Boolean(config.is_thresholds_enabled),
                latest: Boolean(config.latest),
                is_deleted: Boolean(config.is_deleted),
            };
        };
        const transformedExpenseConfig = {
            ...convertExpenseConfigBooleans(expenseConfig),
            master_data_types: parseJsonSafely(expenseConfig.master_data_types),
            expense_types: parseJsonSafely(expenseConfig.expense_types),
        };
        return reply.status(200).send({
            status_code: 200,
            message: 'Expense configuration fetched successfully.',
            trace_id: traceId,
            expenseConfig: transformedExpenseConfig,
        });
    } catch (error: any) {
        console.error('Error fetching expense config:', error);
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching expense configuration.',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function createExpenseConfiguration(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const user = request.user as { sub: string; preferred_username: string };
        const expenseConfig = request.body as ExpenseConfigurationAttributes;

        if (!expenseConfig.hierarchy_ids || !Array.isArray(expenseConfig.hierarchy_ids) || expenseConfig.hierarchy_ids.length === 0) {
            return reply.status(400).send({
                status_code: 400,
                message: "hierarchy_ids are required and must be a non-empty array",
                trace_id: traceId,
            });
        }

        // Check if expense config with same hierarchy_ids already exists
        const existingConfigs = await ExpenseConfigurationModel.findAll({
            where: {
                program_id,
                is_deleted: false,
                latest: true
            }
        });

        for (const config of existingConfigs) {
            const configHierarchyIds = config.hierarchy_ids ?? [];
            const newHierarchyIds = expenseConfig.hierarchy_ids ?? [];

            // Check if arrays have the same elements (regardless of order)
            const sameHierarchies: boolean = configHierarchyIds.length === newHierarchyIds.length &&
                configHierarchyIds.every((id: HierarchyId) => newHierarchyIds.includes(id));

            if (sameHierarchies) {
                return reply.status(409).send({
                    status_code: 409,
                    message: "An expense configuration with the same hierarchy IDs already exists",
                    trace_id: traceId,
                });
            }
        }

        const slug = (expenseConfig.name ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w]+/g, '');

        const expenseConfigData = await ExpenseConfigurationModel.create({
            ...expenseConfig,
            program_id,
            slug,
            created_by: user.sub,
            updated_by: user.sub,
            is_enabled: true,
            is_deleted: false,
        });

        if (Array.isArray(expenseConfig.expense_types)) {
            for (const expenseTypeId of expenseConfig.expense_types) {
                await ExpenseTypeMapping.create({
                    program_id,
                    expense_config_id: expenseConfigData.id,
                    expense_type_id: expenseTypeId,
                });
            }
        }

        return reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: expenseConfigData.id,
            message: "Expense configuration created successfully.",
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating expense configuration.",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function updateExpenseConfiguration(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string; program_id: string };
    const updatedData = request.body as ExpenseConfigurationAttributes;
    const transaction = await sequelize.transaction();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(401).send({ message: "Unauthorized - Token not found" });
    }
    const token = authHeader.split(" ")[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: "Unauthorized - Invalid token" });
    }
    try {
        const existingConfig = await ExpenseConfigurationModel.findOne({
            where: { id, program_id },
            transaction,
        });
        if (!existingConfig) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                trace_id: traceId,
                message: "Expense configuration not found.",
            });
        }

        await existingConfig.update({ latest: false }, { transaction });
        const oldRevision = Number(existingConfig.revision ?? 0);
        const newRevision = oldRevision + 1;
        const updated_on = Date.now();
        const newConfig = await ExpenseConfigurationModel.create(
            {
                ...existingConfig.toJSON(),
                ...updatedData,
                revision: newRevision,
                latest: true,
                created_on: existingConfig.created_on,
                created_by: existingConfig.created_by,
                updated_on: updated_on,
                updated_by: user.sub,
                id: undefined,
            },
            { transaction }
        );
        if (Array.isArray(updatedData.expense_type_ids)) {
            await ExpenseTypeMapping.destroy({
                where: { expense_config_id: existingConfig.id },
                transaction,
            });
            for (const expenseTypeId of updatedData.expense_type_ids) {
                await ExpenseTypeMapping.create(
                    {
                        program_id,
                        expense_config_id: newConfig.id,
                        expense_type_id: expenseTypeId,
                    },
                    { transaction }
                );
            }
        }
        await transaction.commit();
        logger(
            {
                traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                eventname: "expense configuration version created",
                status: "success",
                description: `New version (rev ${newRevision}) created for expense configuration ${id}`,
                level: "success",
                action: request.method,
                url: request.url,
                entity_id: newConfig.id,
                is_deleted: false,
                updated_by: user.sub,
            },
            ExpenseConfigurationModel
        );
        return reply.status(200).send({
            status_code: 200,
            message: "Expense configuration versioned update successful.",
            trace_id: traceId,
            data: newConfig,
        });
    } catch (error: any) {
        await transaction.rollback();
        logger(
            {
                traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                eventname: "expense configuration update failed",
                status: "error",
                description: error.message,
                level: "error",
                action: request.method,
                url: request.url,
                entity_id: id,
                updated_by: user.sub,
            },
            ExpenseConfigurationModel
        );

        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "An error occurred while updating expense configuration.",
            error: error.message,
        });
    }
}


export async function deleteExpenseConfiguration(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string; id: string };
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(401).send({ message: "Unauthorized - Token not found" });
    }
    const token = authHeader.split(" ")[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: "Unauthorized - Invalid token" });
    }
    try {
        const [updatedCount] = await ExpenseConfigurationModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_by: user.sub,
            },
            { where: { program_id, id } }
        );
        if (updatedCount > 0) {
            reply.status(204).send({
                status_code: 204,
                message: 'Expense configuration deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Expense configuration not found.',
                expense_config: [],
                trace_id: traceId,
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting expense configuration.',
            trace_id: traceId,
        });
    }
}

export const getAllExpenseConfigurationHierarchies = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    try {
        const query = getAllExpenseConfigHierarchies;
        const results: any[] = await sequelize.query(query, {
            replacements: { program_id },
            type: QueryTypes.SELECT,
        });
        const hierarchyIds = results.flatMap((row) => row.hierarchy_ids || []);
        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: hierarchyIds.length
                ? 'Hierarchy IDs retrieved successfully.'
                : 'No hierarchy IDs found for the specified program.',
            hierarchies: hierarchyIds,
        });
    } catch (error: any) {
        console.error("Error retrieving hierarchy IDs:", error);
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
};

export async function expenseConfigurationAdvancedFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, name, is_enabled, updated_on, hierarchy_ids } = request.body as { page: number; limit: number; name?: string; is_enabled?: string | boolean; updated_on?: string; hierarchy_ids?: string[] };
        const offset = (page - 1) * limit;
        const whereCondition: any = {
            program_id,
            is_deleted: false,
            latest: true,
        };
        if (name) {
            whereCondition.name = { [Op.like]: `%${name}%` };
        }
        if (is_enabled !== undefined) {
            whereCondition.is_enabled = is_enabled === true || is_enabled === "true";
        }
        if (Array.isArray(updated_on) && updated_on.length === 2) {
            const dateRange = updated_on.map(timestamp => Number(timestamp));

            if (!isNaN(dateRange[0]) && !isNaN(dateRange[1])) {
                whereCondition.updated_on = { [Op.between]: dateRange };
            }
        }

        if (hierarchy_ids && hierarchy_ids.length > 0) {
            whereCondition[Op.and] = sequelize.literal(
                `JSON_CONTAINS(hierarchy_ids, '[${hierarchy_ids.map(id => `"${id}"`).join(', ')}]')`
            );
        }
        whereCondition.latest = true;
        const { count, rows: expenseConfigList } = await ExpenseConfigurationModel.findAndCountAll({
            where: whereCondition,
            offset,
            limit,
            order: [['created_on', 'DESC']],
        });
        const populatedExpenseConfig = await Promise.all(
            expenseConfigList.map(async (config) => {
                const configJSON = config.toJSON();
                let hierarchyDetails: { id: any; name: any }[] = [];
                if (Array.isArray(configJSON.hierarchy_ids) && configJSON.hierarchy_ids.length > 0) {
                    const hierarchies = await Hierarchies.findAll({
                        where: { id: { [Op.in]: configJSON.hierarchy_ids } },
                        attributes: ['id', 'name'],
                    });
                    hierarchyDetails = hierarchies.map((h: any) => ({ id: h.id, name: h.name }));
                }
                return {
                    ...configJSON,
                    hierarchy_ids: hierarchyDetails,
                };
            })
        );
        reply.status(200).send({
            status_code: 200,
            message: populatedExpenseConfig.length > 0
                ? 'Expense configuration fetched successfully.'
                : 'No expense configuration found.',
            trace_id: traceId,
            totalRecords: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            pageSize: limit,
            data: populatedExpenseConfig,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: (error as Error).message,
        });
    }
}


export async function getExpenseTypesByProgramIdAndHierarchies(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids } = request.query as { hierarchy_ids: string };
    const traceId = generateCustomUUID();
    try {
        const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];
        const query = getExpenseByHierarchy(hierarchyIdsArray);
        const replacements = [program_id, ...hierarchyIdsArray];
        const results = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Expense types fetched successfully.',
            data: results,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'An error occurred while fetching expense types.',
            error,
        });
    }
}


export async function getExpenseConfigByExpenseType(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { hierarchy_ids, expense_type_ids } = request.query as { hierarchy_ids: string; expense_type_ids: string };
        const whereCondition: any = {
            program_id,
            is_deleted: false,
            latest: true
        };

        if (hierarchy_ids) {
            const ids = hierarchy_ids.split(',').map(id => id.trim());
            whereCondition[Op.and] = ids.map(id =>
                Sequelize.where(
                    Sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '["${id}"]')`),
                    true));
        }

        if (expense_type_ids) {
            const typeIds = expense_type_ids.split(',').map(id => id.trim());
            const mappings = await ExpenseTypeMapping.findAll({
                where: {
                    expense_type_id: { [Op.in]: typeIds },
                    program_id,
                },
                attributes: ['expense_config_id'],
            });
            const expenseConfigIds = mappings.map((m: any) => m.expense_config_id);
            whereCondition.id = { [Op.in]: expenseConfigIds };
        }

        const expenseConfigs = await ExpenseConfigurationModel.findAll({
            where: whereCondition,
            order: [['created_on', 'DESC']],
        });

        const result = await Promise.all(
            expenseConfigs.map(async (config) => {
                const configJSON = config.toJSON();
                const hierarchies = await Hierarchies.findAll({
                    where: { id: { [Op.in]: configJSON.hierarchy_ids ?? [] } },
                    attributes: ['id', 'name'],
                });
                const expenseTypes = await ExpenseTypeMapping.findAll({
                    where: {
                        expense_config_id: configJSON.id,
                        program_id: configJSON.program_id,
                    },
                    include: [{
                        model: ExpenseTypeModel,
                        as: 'expense_type',
                        attributes: ['id', 'name', 'is_unit_based', 'is_msp_fees_applied',
                            'is_tax_applied', 'max_unit_limit', 'category',
                            'code',],
                    }],
                });
                return {
                    ...configJSON,
                    hierarchy_ids: hierarchies.map(h => ({ id: h.id, name: h.name })),
                    expenseTypes: expenseTypes.map((e: any) => ({
                        id: e.expense_type?.id,
                        name: e.expense_type?.name,
                        is_unit_based: e.expense_type?.is_unit_based,
                        is_msp_fees_applied: e.expense_type?.is_msp_fees_applied,
                        is_tax_applied: e.expense_type?.is_tax_applied,
                        max_unit_limit: e.expense_type?.max_unit_limit,
                        category: e.expense_type?.category,
                        code: e.expense_type?.code,
                    })),
                };
            }));

        reply.status(200).send({
            status_code: 200,
            message: result.length > 0 ? 'Expense configuration fetched.' : 'No configuration found.',
            trace_id: traceId,
            data: result,
        });

    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: (error as Error).message,
        });
    }
}
