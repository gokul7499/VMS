import { FastifyRequest, FastifyReply } from "fastify";
import ExpenseConfigurationModel from "../models/expense-configuration.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { ExpenseConfigurationAttributes } from "../interfaces/expense-configuration.interfaces";
import { QueryTypes, Op } from 'sequelize';
import { configAdvancedFilter, getAllExpenseConfigHierarchies, getAllExpenseTypeHierarchy, getExpenseByHierarchy, getExpenseType } from "../utility/queries";
import { sequelize } from "../config/instance";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";
import FoundationalDataTypes from "../models/foundational-datatypes.model";
import ExpenseTypeMapping from "../models/expense-config-expense-type-mapping.model";
import Hierarchies from "../models/hierarchies.model";
import IndustriesModel from "../models/labour-category.model";

export async function getExpenseConfigurations(
    request: FastifyRequest<{
        Params: { program_id: string },
        Querystring: {
            page?: number;
            limit?: number;
            search?: string;
            status?: string;
            updated_on?: string;
            hierarchy_ids?: string;
        };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const {
            page = 1,
            limit = 10,
            search,
            status,
            updated_on,
            hierarchy_ids,
        } = request.query;
        const offset = (page - 1) * limit;
        const whereCondition: any = {
            program_id,
            is_deleted: false,
        };

        if (search) {
            whereCondition.name = { [Op.iLike]: `%${search}%` };
        }
        if (status) {
            whereCondition.status = status;
        }
        if (updated_on) {
            const dateRange = updated_on.split(',').map(date => new Date(date.trim()));

            if (dateRange.length === 2 && !isNaN(dateRange[0].getTime()) && !isNaN(dateRange[1].getTime())) {
                whereCondition.updated_on = { [Op.between]: [dateRange[0].toISOString(), dateRange[1].toISOString()] };
            }
        }
        if (hierarchy_ids) {
            const ids = hierarchy_ids.split(',').map((id) => id.trim());
            whereCondition.hierarchy_ids = {
                [Op.overlap]: ids,
            };
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
            expenseConfig: populatedExpenseConfig,
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
        const expenseConfig = await ExpenseConfigurationModel.findOne({
            where: { program_id, id },
        });

        if (!expenseConfig) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Expense configuration not found.',
                expense_config: [],
                trace_id: traceId,
            });
        }
        const laborCategoryIds = Array.isArray(expenseConfig.labor_category_ids) ? expenseConfig.labor_category_ids : [];
        const hierarchyIds = Array.isArray(expenseConfig.hierarchy_ids) ? expenseConfig.hierarchy_ids : [];
        const hierarchies = await Hierarchies.findAll({
            where: { id: { [Op.in]: hierarchyIds } },
            attributes: ['id', 'name'],
        });
        const laborCategories = await IndustriesModel.findAll({
            where: { id: { [Op.in]: laborCategoryIds } },
            attributes: ['id', 'name'],
        });
        const masterDataTypeIds = Array.isArray(expenseConfig.master_data_types) ? expenseConfig.master_data_types : [];
        const masterDataTypes = await FoundationalDataTypes.findAll({
            where: { id: { [Op.in]: masterDataTypeIds } },
            attributes: ['id', 'name'],
        });
        const transformedExpenseConfig = {
            ...expenseConfig.toJSON(),
            hierarchy_ids: hierarchies,
            labor_category_ids: laborCategories,
            master_data_types: masterDataTypes,
        };
        return reply.status(200).send({
            status_code: 200,
            message: 'Expense configuration fetched successfully.',
            trace_id: traceId,
            expenseConfig: transformedExpenseConfig,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching expense configuration.',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function createExpenseConfiguration(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
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
        const { program_id } = request.params as { program_id: string };
        const expenseConfig = request.body as ExpenseConfigurationAttributes;

        const created_on = expenseConfig.created_on || Date.now();
        const updated_on = expenseConfig.updated_on || Date.now();
        const entity_id = uuidv4();
        const expenseConfigData = await ExpenseConfigurationModel.create({
            ...expenseConfig,
            program_id,
            created_on,
            entity_id,
            modified_on: updated_on,
            created_by: user.sub,
            updated_by: user.sub,
            is_enabled: true,
            is_deleted: false,
        });
        if (Array.isArray(expenseConfig.expense_type_ids)) {
            for (const expenseTypeId of expenseConfig.expense_type_ids) {
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
        const newConfigId = uuidv4();
        const oldRevision = Number(existingConfig.revision ?? 0);
        const newRevision = oldRevision + 1;
        const timestamp = Date.now();
        const newConfig = await ExpenseConfigurationModel.create(
            {
                ...existingConfig.toJSON(),
                ...updatedData,
                id: newConfigId,
                revision: newRevision,
                latest: true,
                created_on: existingConfig.created_on,
                created_by: existingConfig.created_by,
                modified_on: timestamp,
                updated_by: user.sub,
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
                        expense_config_id: newConfigId,
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
                entity_id: newConfigId,
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
    request: FastifyRequest<{
        Params: { program_id: string };
        Body: {
            page?: number;
            limit?: number;
            search?: string;
            status?: string;
            updated_on?: string;
            hierarchy_ids?: string;
        };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const {
            page = 1,
            limit = 10,
            search,
            status,
            updated_on,
            hierarchy_ids,
        } = request.body;
        const offset = (page - 1) * limit;
        const whereCondition: any = {
            program_id,
            is_deleted: false,
        };
        if (search) {
            whereCondition.name = { [Op.iLike]: `%${search}%` };
        }
        if (status) {
            whereCondition.status = status;
        }
        if (updated_on) {
            const dateRange = updated_on.split(',').map(date => new Date(date.trim()));
            if (dateRange.length === 2 && !isNaN(dateRange[0].getTime()) && !isNaN(dateRange[1].getTime())) {
                whereCondition.updated_on = { [Op.between]: [dateRange[0].toISOString(), dateRange[1].toISOString()] };
            }
        }
        if (hierarchy_ids) {
            const ids = hierarchy_ids.split(',').map((id) => id.trim());
            whereCondition.hierarchy_ids = {
                [Op.overlap]: ids,
            };
        }
        const { count, rows: expenseConfigList } = await ExpenseConfigurationModel.findAndCountAll({
            where: whereCondition,
            offset,
            limit,
            order: [['created_on', 'DESC']],
        });
        const updatedByIds = expenseConfigList
            .map(config => config.updated_by)
            .filter(id => id);
        const users = updatedByIds.length > 0
            ? await sequelize.query(
                'SELECT user_id, first_name FROM `user` WHERE user_id IN (:updatedByIds)',
                {
                    replacements: { updatedByIds },
                    type: QueryTypes.SELECT,
                }
            )
            : [];
        const userMap = Object.fromEntries(users.map((u: any) => [u.user_id, u.first_name]));
        const populatedExpenseConfig = await Promise.all(
            expenseConfigList.map(async (config) => {
                const configJSON = config.toJSON();
                const updatedByName = userMap[config.updated_by] || null;

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
                    updated_by_name: updatedByName,
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
            data: {
                pagination: {
                    totalRecords: count,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    pageSize: limit,
                    hasNextPage: page * limit < count,
                    hasPreviousPage: page > 1,
                },
                expenseConfigurations: populatedExpenseConfig,
            }
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
function uuidv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}


