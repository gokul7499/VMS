import { FastifyRequest, FastifyReply } from "fastify";
import ExpenseConfigurationModel from "../models/expense-configuration.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { ExpenseConfigurationAttributes } from "../interfaces/expense-configuration.interfaces";
import ExpenseTypeMapping from "../models/expense-type-mapping.model";
import { QueryTypes, Op } from 'sequelize';
import { configAdvancedFilter, getAllExpenseConfigHierarchies, getAllExpenseTypeByHierarchies, getAllExpenseTypeHierarchy, getExpenseByHierarchy, getExpenseType } from "../utility/queries";
import { sequelize } from "../config/instance";
import expenseTypeHierarchie from "../models/expense-type-hierarchie.model";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";
import FoundationalDataTypes from "../models/foundational-datatypes.model";

export async function getExpenseConfigurations(
    request: FastifyRequest<{ Params: { program_id: string }, Querystring: { page?: string, limit?: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { page = '1', limit = '10' } = request.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const offset = (pageNum - 1) * limitNum;

        const { rows: expenseConfig, count: totalRecords } = await ExpenseConfigurationModel.findAndCountAll({
            where: { program_id, is_deleted: false },
            attributes: [
                'id',
                'name',
                'status',
                'is_enabled',
                'program_id',
                'weekending_day',
                "enable_thresholds",
                'revoke_worker_access',
                "general_exp_incurred_submission",
                'mdt_display_headers',
                'project',
                'created_on',
                'updated_on',
                'updated_by',
            ],
            offset,
            limit: limitNum,
            order: [['created_on', 'DESC']],
        });

        const expenseTypeHierarchy = await sequelize.query(getAllExpenseTypeHierarchy, {
            replacements: { program_id },
            type: QueryTypes.SELECT,
        });
        const hierarchyMap: { [key: string]: { id: string, name: string }[] } = {};
        expenseTypeHierarchy.forEach((item: any) => {
            let hierarchyArray;
            try {
                hierarchyArray = typeof item.hierarchy === 'string' ? JSON.parse(item.hierarchy) : item.hierarchy;
            } catch (error) {
                console.error('Failed to parse hierarchy JSON:', error, item.hierarchy);
                hierarchyArray = [];
            }
            hierarchyMap[item.config_id] = hierarchyArray;
        });
        const populatedExpenseConfig = expenseConfig.map(config => ({
            ...config.toJSON(),
            status: config.status === '1',
            hierarchy: hierarchyMap[config.id] || [],
        }));
        reply.status(200).send({
            status_code: 200,
            message: populatedExpenseConfig.length > 0
                ? 'Expense configuration fetched successfully.'
                : 'No expense configuration found.',
            trace_id: traceId,
            expenseConfig: populatedExpenseConfig,
            totalRecords,
            page: pageNum,
            items_per_page: limitNum,
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
        const { program_id, id } = request.params as { program_id: string, id: string };
        const expenseConfig = await ExpenseConfigurationModel.findOne({
            where: { program_id, id },
        });

        if (!expenseConfig) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Expense configuration not found.',
                expense_config: [],
                trace_id: traceId,
            });
        }
        const expenseType = await sequelize.query(getExpenseType, {
            replacements: { program_id, id },
            type: QueryTypes.SELECT,
        });
        let hierarchy: any[] = [];
        expenseType.forEach((expense: any) => {
            if (expense.hierarchy && Array.isArray(expense.hierarchy)) {
                hierarchy = hierarchy.concat(expense.hierarchy);
            } else if (expense.hierarchy) {
                hierarchy.push(expense.hierarchy);
            }
        });
        hierarchy = Array.from(
            new Map(hierarchy.map((item: any) => [item.id, item])).values()
        );
        const transformedExpenseTypes = expenseType.map((expense: any) => {
            const { hierarchy, ...expenseData } = expense;
            return expenseData;
        });

        const masterData = await FoundationalDataTypes.findAll({
            where: {
                id: {
                    [Op.in]: expenseConfig.master_data.value,
                },
            },
            attributes: ["id", "name"],
        });

        const formattedMasterData = {
            value: masterData.map((data: any) => ({
                id: data.id,
                name: data.name,
            })),
            is_enabled: expenseConfig.master_data.is_enabled,
        };

        const transformedExpenseConfig = {
            ...expenseConfig.toJSON(),
            status: expenseConfig.status === "1",
            expense_item_type_config: transformedExpenseTypes,
            hierarchy: hierarchy,
            master_data: formattedMasterData, 
        };

        return reply.status(200).send({
            status_code: 200,
            message: 'Expense configuration fetched successfully.',
            trace_id: traceId,
            expenseConfig: transformedExpenseConfig,
        });
    } catch (error: any) {
        console.error("Error fetching expense configuration:", error);

        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching expense configuration.',
            trace_id: traceId,
            error: error instanceof Error ? error.message : JSON.stringify(error),
        });
    }
}

export async function createExpenseConfiguration(
    request: FastifyRequest<{ Params: { program_id: string } }>,
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

    logger(
        {
            traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating expense configuration",
            status: "info",
            description: `Creating expense configuration for program_id ${request.params.program_id}`,
            level: "info",
            action: request.method,
            url: request.url,
            entity_id: request.params.program_id,
            is_deleted: false,
            created_by: user.sub,
            updated_by: user.sub,
        },
        ExpenseConfigurationModel
    );

    try {
        const { program_id } = request.params as { program_id: string };
        const expenseConfig: ExpenseConfigurationAttributes = request.body as ExpenseConfigurationAttributes;

        const expenseConfigData = await ExpenseConfigurationModel.create({
            ...expenseConfig,
            program_id,
            created_by: user.sub,
            updated_by: user.sub,
        });
        logger(
            {
                traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: expenseConfig,
                eventname: "expense configuration created",
                status: "success",
                description: `Expense configuration created successfully for program_id ${program_id}`,
                level: "success",
                action: request.method,
                url: request.url,
                entity_id: expenseConfigData.id,
                is_deleted: false,
                created_by: user.sub,
                updated_by: user.sub,
            },
            ExpenseConfigurationModel
        );

        if (Array.isArray(expenseConfig.expense_item_type_config) && expenseConfig.expense_item_type_config.length > 0) {
            for (const expenseTypeId of expenseConfig.expense_item_type_config) {
                await ExpenseTypeMapping.create({
                    program_id,
                    expense_config_id: expenseConfigData.id,
                    expense_type_id: expenseTypeId,
                    created_on: new Date(),
                    updated_on: new Date(),
                });
                logger(
                    {
                        traceId,
                        actor: {
                            user_name: user?.preferred_username,
                            user_id: user?.sub,
                        },
                        data: { expense_type_id: expenseTypeId },
                        eventname: "expense type mapping created",
                        status: "success",
                        description: `Expense type mapping created for expense_config_id ${expenseConfigData.id}`,
                        level: "success",
                        action: request.method,
                        url: request.url,
                        entity_id: expenseConfigData.id,
                        is_deleted: false,
                        created_by: user.sub,
                        updated_by: user.sub,
                    },
                    ExpenseTypeMapping
                );
            }
        }

        if (Array.isArray(expenseConfig.hierarchy) && expenseConfig.hierarchy.length > 0) {
            const hierarchyMappings = expenseConfig.hierarchy.map((hierarchyId) => ({
                expense_config_id: expenseConfigData.id,
                hierarchy: hierarchyId,
            }));
            await expenseTypeHierarchie.bulkCreate(hierarchyMappings);
            logger(
                {
                    traceId,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: { hierarchy: expenseConfig.hierarchy },
                    eventname: "hierarchy mappings created",
                    status: "success",
                    description: `Hierarchy mappings created for expense_config_id ${expenseConfigData.id}`,
                    level: "success",
                    action: request.method,
                    url: request.url,
                    entity_id: expenseConfigData.id,
                    is_deleted: false,
                    created_by: user.sub,
                    updated_by: user.sub,
                },
                expenseTypeHierarchie
            );
        }

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: expenseConfigData.id,
            message: "Expense configuration created successfully.",
        });
    } catch (error: any) {
        logger(
            {
                traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "expense configuration creation failed",
                status: "failed",
                description: `Expense configuration creation failed for program_id ${request.params.program_id}`,
                level: "error",
                action: request.method,
                url: request.url,
                entity_id: request.params.program_id,
                is_deleted: false,
                created_by: user.sub,
                updated_by: user.sub,
            },
            ExpenseConfigurationModel
        );
        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating expense configuration.",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function updateExpenseConfiguration(
    request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params;
    const expenseConfigData = request.body as ExpenseConfigurationAttributes;
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
        const existingExpenseConfig = await ExpenseConfigurationModel.findOne({ where: { program_id, id }, transaction });
        if (!existingExpenseConfig) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: 'Expense configuration not found.',
                trace_id: traceId,
            });
        }
        await ExpenseConfigurationModel.update(expenseConfigData, {
            where: { id, program_id }
        });

        if (
            Array.isArray(expenseConfigData.expense_item_type_config) &&
            expenseConfigData.expense_item_type_config.length > 0
        ) {
            const updatedExpenseTypeIds = expenseConfigData.expense_item_type_config;

            await ExpenseTypeMapping.destroy({
                where: {
                    expense_config_id: id,
                    id: { [Op.notIn]: updatedExpenseTypeIds },
                },
                transaction,
            });

            const updatedOn = Date.now();
            const createPromises = updatedExpenseTypeIds.map(expenseTypeId =>
                ExpenseTypeMapping.create({
                    expense_type_id: expenseTypeId,
                    expense_config_id: id,
                    program_id,
                    updated_on: updatedOn,
                    created_on: updatedOn,
                }, { transaction }
                )
            );

            await Promise.all(createPromises);
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
                description: `Expense configuration with ID ${id} for program_id ${program_id} updated successfully`,
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
            message: 'Expense configuration updated successfully.',
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
                updated_by: user.sub,
            },
            ExpenseConfigurationModel
        );

        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal Server Error.',
            error: error.message || error,
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

export async function getExpenseTypesByProgramIdAndHierarchy(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_id, is_enabled } = request.query as { hierarchy_id?: string, is_enabled?: boolean | string };
    const traceId = generateCustomUUID();
    if (!hierarchy_id) {
        return reply.status(400).send({
            status_code: 400,
            trace_id: traceId,
            message: 'Hierarchy id is missing.',
        });
    }
    try {
        const hierarchyIds = hierarchy_id ? hierarchy_id.split(",") : [];
        let hierarchyCondition = "";

        if (hierarchyIds.length > 0) {
            hierarchyCondition = hierarchyIds
                .map((id, index) => `JSON_CONTAINS(ec.hierarchy, :hierarchyId${index})`)
                .join(" OR ");
        }

        const isEnabled = is_enabled === undefined
            ? null
            : is_enabled === 'true' || is_enabled === true;

        const query = getAllExpenseTypeByHierarchies(hierarchyCondition, isEnabled);
        const replacements: any = { program_id };
        hierarchyIds.forEach((id, index) => {
            replacements[`hierarchyId${index}`] = JSON.stringify([id]);
        });

        const results: any[] = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        const formattedResults = results.map((item) => ({
            ...item,
            is_enabled: item.is_enabled === 1,
            unit_base: item.unit_base === 1,
            status: item.status === 1,
            attachment_mandatory: item.attachment_mandatory === 1,
            notes_mandatory: item.notes_mandatory === 1,
            msp_applicable: item.msp_applicable === 1,
            allow_negative_expenses: item.allow_negative_expenses === 1,
        }));

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Expense type fetched successfully.',
            data: formattedResults,
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

export const getAllExpenseConfigurationHierarchies = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params;

    try {
        const query = getAllExpenseConfigHierarchies;
        const results: any[] = await sequelize.query(query, {
            replacements: { program_id },
            type: QueryTypes.SELECT,
        });

        if (results.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No hierarchies found for the specified program.',
                hierarchies: [],
                trace_id: traceId,
            });
        }
        const hierarchies = Array.from(new Map(results[0].hierarchy.map((item: any) => [item.id, item])).values());

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Hierarchies retrieved successfully.',
            hierarchies,
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
    request: FastifyRequest<{
        Params: { program_id: string };
        Body: {
            name?: string;
            status?: string;
            updated_on?: string[];
            is_enabled?: boolean;
            hierarchy?: string[];
            page?: string;
            limit?: string;
        };
    }>,
    reply: FastifyReply
) {
    const trace_id = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { name, status, updated_on, is_enabled, hierarchy, page, limit } = request.body;

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

export async function getExpenseTypesByProgramId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const { is_enabled, expense_code, expense_item_type_config } = request.query as {
        is_enabled?: boolean | string;
        expense_code?: string;
        expense_item_type_config?: string;
    };
    const traceId = generateCustomUUID();

    try {
        const isEnabledFilter = is_enabled === undefined
            ? undefined
            : is_enabled === 'true' || is_enabled === true;
        const whereCondition: any = { program_id };
        if (isEnabledFilter !== undefined) {
            whereCondition.is_enabled = isEnabledFilter;
        }
        if (expense_code) {
            whereCondition.expense_code = expense_code;
        }
        if (expense_item_type_config) {
            whereCondition.expense_item_type_config = { [Op.like]: `%${expense_item_type_config}%` }; // Partial match filter
        }
        const results = await ExpenseTypeMapping.findAll({
            where: whereCondition,
            attributes: ['id', 'expense_item_type_config', 'expense_code', 'expense_name', 'is_enabled'],
        });
        const formattedResults = results.map((item) => ({
            id: item.id,
            expense_item_type_config: item.expense_item_type_config,
            expense_code: item.expense_code,
            expense_name: item.expense_name,
            is_enabled: item.is_enabled,
        }));
        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Expense type fetched successfully.',
            data: formattedResults,
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
