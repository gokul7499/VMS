import { FastifyRequest, FastifyReply } from "fastify";
import ExpenseConfigurationModel from "../models/expense-configuration.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { ExpenseConfigurationAttributes } from "../interfaces/expense-configuration.interfaces";
import { QueryTypes, Op } from 'sequelize';
import { configAdvancedFilter, getAllExpenseConfigHierarchies, getAllExpenseTypeByHierarchies, getAllExpenseTypeHierarchy, getExpenseByHierarchy, getExpenseType } from "../utility/queries";
import { sequelize } from "../config/instance";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";
import FoundationalDataTypes from "../models/foundational-datatypes.model";
import ExpenseConfigHierarchyMapping from "../models/expense-config-hierarchie.model";
import ExpenseTypeMapping from "../models/expense-config-expense-type-mapping.model";
import Hierarchies from "../models/hierarchies.model";
import ExpenseTypeModel from "../models/expense-type.model";

export async function getExpenseConfigurations(
    request: FastifyRequest<{
        Params: { program_id: string },
        Querystring: {
            page?: number,
            limit?: number,
            search?: string,
            status?: string
        }
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
                `SELECT user_id, first_name FROM user WHERE user_id IN (:updatedByIds)`,
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
                const hierarchyMappings = await ExpenseConfigHierarchyMapping.findAll({
                    where: { program_id, expense_config_id: config.id },
                    include: [
                        {
                            model: Hierarchies,
                            as: 'hierarchy',
                            attributes: ['id', 'name'],
                        },
                    ],
                });

                const hierarch_ids = hierarchyMappings.map((item) => ({
                    id: item.hierarchy?.id,
                    name: item.hierarchy?.name,
                }));
                const updatedByName = userMap[config.updated_by] || null;
                return {
                    ...configJSON,
                    hierarch_ids,
                    updated_by_name: updatedByName,
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
        const hierarchyIds = Array.isArray(expenseConfig.hierarch_ids) ? expenseConfig.hierarch_ids : [];
        const expenseTypeIds = Array.isArray(expenseConfig.expense_type_ids) ? expenseConfig.expense_type_ids : [];
        const hierarchies = await Hierarchies.findAll({
            where: { id: { [Op.in]: hierarchyIds } },
            attributes: ['id', 'name'],
        });
        const expenseTypes = await ExpenseTypeModel.findAll({
            where: { id: { [Op.in]: expenseTypeIds } },
            attributes: [
                'id',
                'name',
                'category',
                'apply_msp_fee',
                'appply_tax',
                'allow_unit_based',
            ],
        });
        const projectsField = (expenseConfig as any).projects;
        let populatedProjects: { value: { id: any; name: any }[]; is_enabled: boolean } = {
            value: [],
            is_enabled: false,
        };
        if (
            projectsField &&
            typeof projectsField === 'object' &&
            Array.isArray(projectsField.value)
        ) {
            const projectData = await FoundationalDataTypes.findAll({
                where: { id: { [Op.in]: projectsField.value } },
                attributes: ['id', 'name'],
            });
            populatedProjects = {
                value: projectData.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                })),
                is_enabled: projectsField.is_enabled ?? false,
            };}
        const transformedExpenseConfig = {
            ...expenseConfig.toJSON(),
            expense_type_ids: expenseTypes,
            hierarch_ids: hierarchies,
            projects: populatedProjects,
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
        const expenseConfigData = await ExpenseConfigurationModel.create({
            ...expenseConfig,
            program_id,
            created_on,
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
        if (Array.isArray(expenseConfig.hierarch_ids)) {
            for (const hierarchyId of expenseConfig.hierarch_ids) {
                await ExpenseConfigHierarchyMapping.create({
                    program_id,
                    expense_config_id: expenseConfigData.id,
                    hierarchy_id: hierarchyId,

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
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: "Expense configuration not found.",
            });
        }
        const updated_on = Date.now();
        await ExpenseConfigurationModel.update(
            {
                ...updatedData,
                updated_by: user.sub,
                modified_on: updated_on,
            }, {
            where: { id, program_id },
            transaction,
        }
        );
        if (Array.isArray(updatedData.expense_type_ids)) {
            await ExpenseTypeMapping.destroy({
                where: { expense_config_id: id },
                transaction,
            });
            for (const expenseTypeId of updatedData.expense_type_ids) {
                await ExpenseTypeMapping.create(
                    {
                        program_id,
                        expense_config_id: id,
                        expense_type_id: expenseTypeId,
                    },
                    { transaction }
                );
            }
        }
        if (Array.isArray(updatedData.hierarch_ids)) {
            await ExpenseConfigHierarchyMapping.destroy({
                where: { expense_config_id: id },
                transaction,
            });
            for (const hierarchyId of updatedData.hierarch_ids) {
                await ExpenseConfigHierarchyMapping.create(
                    {
                        program_id,
                        expense_config_id: id,
                        hierarchy_id: hierarchyId,
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
                eventname: "expense configuration updated",
                status: "success",
                description: `Expense configuration with ID ${id} updated successfully`,
                level: "success",
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false,
                updated_by: user.sub,
            },
            ExpenseConfigurationModel
        );
        return reply.status(200).send({
            status_code: 200,
            message: "Expense configuration updated successfully.",
            trace_id: traceId,
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
            reply.status(404).send({
                status_code: 404,
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
        if (!results || results.length === 0 || !results[0].expense_config_hierarchy_mapping) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No hierarchies found for the specified program.',
                hierarchies: [],
                trace_id: traceId,
            });
        }
        const hierarchyArray = results[0].expense_config_hierarchy_mapping;
        const uniqueHierarchies = Array.from(
            new Map(hierarchyArray.map((item: any) => [item.id, item])).values()
        );
        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Hierarchies retrieved successfully.',
            hierarchies: uniqueHierarchies,
        });
    } catch (error: any) {
        console.error("Error retrieving hierarchies:", error);
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
    const trace_id = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { name, status, updated_on, is_enabled, hierarchy, page, limit } = request.body as { name?: string, status?: string, updated_on?: string[], is_enabled?: boolean, hierarchy?: string[], page?: string, limit?: string };
        const hasConfigName = name !== undefined;
        const hasStatus = status !== undefined;
        const hasModifiedOn = updated_on !== undefined;
        const hasIsEnabled = is_enabled !== undefined;
        const hasPage = page !== undefined;
        const hasLimit = limit !== undefined;
        const hierarchyIdsArray = hierarchy || [];
        const modifiedOnArray = updated_on || [];
        const pageNumber = hasPage ? parseInt(page, 10) : 1;
        const limitNumber = hasLimit ? parseInt(limit, 10) : 10;
        const offset = (pageNumber - 1) * limitNumber;

        const query = configAdvancedFilter(
            hasConfigName,
            hasStatus,
            hasModifiedOn,
            hasIsEnabled,
            hierarchyIdsArray,
            modifiedOnArray
        );

        const replacements: Record<string, any> = {
            program_id,
            name: name ? `%${name}%` : null,
            status: hasStatus ? status : null,
            updated_on: modifiedOnArray,
            is_enabled: hasIsEnabled ? is_enabled : null,
            limit: limitNumber,
            offset,
        };
        modifiedOnArray.forEach((_, index) => {
            replacements[`updated_on${index}`] = modifiedOnArray[index];
        });
        hierarchyIdsArray.forEach((_, index) => {
            replacements[`hierarchy${index}`] = hierarchyIdsArray[index];
        });
        const data = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });
        const transformedData = data.map((item: any) => ({
            ...item,
        }));

        if (transformedData.length > 0) {
            return reply.status(201).send({
                status_code: 201,
                total_records: transformedData.length,
                items: transformedData,
                trace_id,
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total_pages: Math.ceil(transformedData.length / limitNumber),
                },
            });
        } else {
            return reply.status(200).send({ status_code: 200, message: 'No records found', items: [], trace_id });
        }
    } catch (error: any) {
        return reply.status(500).send({ status_code: 500, message: 'Internal Server Error', trace_id, error: error.message });
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
