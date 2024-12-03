import { FastifyRequest, FastifyReply } from "fastify";
import ExpenseConfigurationModel from "../models/expense-configuration.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { ExpenseConfigurationAttributes } from "../interfaces/expense-configuration.interfaces";
import ExpenseType from "../models/expense-type.model";
import hierarchies from "../models/hierarchiesModel";
import { QueryTypes , Op } from 'sequelize';
import { configAdvancedFilter, getAllExpenseConfigHierarchies, getAllExpenseTypeByHierarchies } from "../utility/queries";
import { sequelize } from "../config/instance";

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
                'config_name',
                'status',
                'program_id',
                'is_expense',
                'hierarchy',
                'expense_start_date',
                'week_end_day',
                'created_on',
                'modified_on',
                'updated_by',
            ],
            offset,
            limit: limitNum,
            order: [['created_on', 'DESC']],
        });
        const hierarchyIds = [
            ...new Set(
                expenseConfig
                    .map(config => (Array.isArray(config.hierarchy) ? config.hierarchy : []))
                    .flat()
            ),
        ];
        let hierarchyMap: Record<string, { id: string; name: string }> = {};
        if (hierarchyIds.length > 0) {
            const hierarchyDetails = await hierarchies.findAll({
                where: { id: hierarchyIds },
                attributes: ['id', 'name'],
            });

            hierarchyMap = Object.fromEntries(
                hierarchyDetails.map(hierarchy => [hierarchy.id, hierarchy])
            );
        }
        const populatedExpenseConfig = expenseConfig.map(config => ({
            ...config.toJSON(),
            status: config.status === '1',
            hierarchy: (config.hierarchy || []).map((hierarchyId: string) =>
                hierarchyMap[hierarchyId] || { id: hierarchyId, name: 'Unknown' }
            ),
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
            message: 'An error occurred while fetching expense configuration.',
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
        const hierarchyIds = expenseConfig.hierarchy;
        const hierarchyDetails = await hierarchies.findAll({
            where: { id: hierarchyIds },
            attributes: ['id', 'name'],
        });
        const expenseType = await ExpenseType.findAll({
            where: { expense_config_id: id, program_id },
        });

        const transformedExpenseConfig = {
            ...expenseConfig.toJSON(),
            status: expenseConfig.status === "1",
            hierarchy: hierarchyDetails,
            expense_type: expenseType
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
            error: error.message
        });
    }
}

export async function createExpenseConfiguration(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string };
    const traceId = generateCustomUUID();

    try {

        const expenseConfig: ExpenseConfigurationAttributes = request.body as ExpenseConfigurationAttributes;

        const expenseConfigData = await ExpenseConfigurationModel.create({ ...expenseConfig, program_id });
        if (Array.isArray(expenseConfig.expense_type) && expenseConfig.expense_type.length > 0) {
            for (const expenseType of expenseConfig.expense_type) {
                await ExpenseType.create({
                    program_id,
                    expense_config_id: expenseConfigData.id,
                    expense_type: expenseType.expense_type,
                    expense_code: expenseType.expense_code,
                    expense_name: expenseType.expense_name,
                    expense_icon: expenseType.expense_icon,
                    attachment_mandatory: expenseType.attachment_mandatory,
                    notes_mandatory: expenseType.notes_mandatory,
                    msp_applicable: expenseType.msp_applicable,
                    status: expenseType.status,
                    unit_base: expenseType.unit_base,
                    unit_base_config: expenseType.unit_base_config,
                    created_on: new Date(),
                    modified_on: new Date(),
                });
            }
        }

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: expenseConfigData.id,
            message: 'Expense configuration created successfully.'
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating expense configuration.',
            trace_id: traceId,
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

        await existingExpenseConfig.update(expenseConfigData, { transaction });

        if (Array.isArray(expenseConfigData.expense_type) && expenseConfigData.expense_type.length > 0) {
            const existingExpenseTypeIds = expenseConfigData.expense_type.map(et => et.id).filter(Boolean);

            await ExpenseType.destroy({
                where: {
                    expense_config_id: id,
                    id: { [Op.notIn]: existingExpenseTypeIds },
                },
                transaction,
            });

            const modifiedOn = new Date();
            const upsertPromises = expenseConfigData.expense_type.map(expenseType =>
                ExpenseType.upsert({
                    ...expenseType,
                    id: expenseType.id,
                    program_id,
                    expense_config_id: id,
                    modified_on: modifiedOn,
                    created_on: expenseType.id ? undefined : modifiedOn,
                }, { transaction })
            );

            await Promise.all(upsertPromises);
        }
        await transaction.commit();
        return reply.status(200).send({
            status_code: 200,
            message: 'Expense configuration updated successfully.',
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal Server Error.',
            error: error.message || error,
        });
    }
}

export async function deleteExpenseConfiguration(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string, id: string };

    try {
        const [updatedCount] = await ExpenseConfigurationModel.update(
            { is_deleted: true, is_enabled: false },
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
    } catch (error) {
        reply.status(500).send({
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
        const hierarchies = results[0].hierarchies_d || [];
        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Hierarchies retrieved successfully.',
            hierarchies,
        });
    } catch (error: any) {
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
            config_name?: string;
            status?: string;
            modified_on?: string;
            hierarchy_ids?: string[];
            page?: string;
            limit?: string;
        };
    }>,
    reply: FastifyReply
) {
    const trace_id = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { config_name, status, modified_on, hierarchy_ids, page, limit } = request.body;

        const hasConfigName = !!config_name;
        const hasStatus = !!status;
        const hasModifiedOn = !!modified_on;
        const hasPage = !!page;
        const hasLimit = !!limit;
        const hierarchyIdsArray = hierarchy_ids || [];

        const pageNumber = hasPage ? parseInt(page, 100) : 1;
        const limitNumber = hasLimit ? parseInt(limit, 100) : 100;
        const offset = (pageNumber - 1) * limitNumber;

        const query = configAdvancedFilter(
            hasConfigName,
            hasStatus,
            hasModifiedOn,
            hierarchyIdsArray
        );

        const replacements: Record<string, any> = {
            program_id,
            config_name: config_name ? `%${config_name}%` : null,
            status,
            modified_on,
            limit: limitNumber,
            offset,
        };

        hierarchyIdsArray.forEach((id, index) => {
            replacements[`hierarchy_ids${index}`] = id;
        });

        const data = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });
        const transformedData = data.map((item: any) => ({
            ...item,
            status: item.status === "1"
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
            return reply.status(200).send({ message: 'No records found', items: [], trace_id });
        }
    } catch (error: any) {
        return reply.status(500).send({ message: 'Internal Server Error', trace_id, error: error.message });
    }
}



