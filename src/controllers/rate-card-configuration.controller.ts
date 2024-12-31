import { FastifyRequest, FastifyReply } from 'fastify';
import { RateCardModel } from '../models/rate-card-configuration.model';
import { MinMaxRateResult, RateCardInterface } from '../interfaces/rate-card-configuration.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import RateCardMapping from '../models/rate-card-mapping.model';
import { sequelize } from '../config/instance';
import { Op, QueryTypes } from 'sequelize';
import {
    rateCardQuery,
    getCountQuery,
    getAllRateCardQuery,
    minMaxRateQuery,
    rateTypeConfigQuery,
    existingPairQuery
} from '../utility/queries';
import hierarchies from '../models/hierarchies.model';

export async function getAllRateCard(
    request: FastifyRequest<{
        Params: RateCardInterface;
        Querystring: RateCardInterface;
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params as Partial<RateCardInterface>;
        const query = request.query as any;

        const page = parseInt(query.page ?? "1", 10);
        const limit = parseInt(query.limit ?? "10", 10);
        const offset = (page - 1) * limit;
        const filters: Record<string, any> = {
            program_id: params.program_id,
            limit,
            offset,
            is_enabled:
                query.is_enabled === "true"
                    ? true
                    : query.is_enabled === "false"
                        ? false
                        : null,
            is_shift_rate:
                query.is_shift_rate === "true"
                    ? true
                    : query.is_shift_rate === "false"
                        ? false
                        : null,
            name: query.name ? `%${query.name}%` : null,
        };
        let startDate: number | undefined;
        let endDate: number | undefined;

        if (query.modified_on) {
            const dateRange = query.modified_on.split(",");
            if (dateRange.length === 2) {
                startDate = parseInt(dateRange[0], 10) || undefined;
                endDate = parseInt(dateRange[1], 10) || undefined;
            }
        }

        addArrayFilters(query.hierarchy_id, "hierarchy_id", filters);
        addArrayFilters(query.job_template_id, "job_template_id", filters);

        const hierarchyIdCount = Object.keys(filters).filter((key) =>
            key.startsWith("hierarchy_id_")
        ).length;
        const jobTemplateIdCount = Object.keys(filters).filter((key) =>
            key.startsWith("job_template_id_")
        ).length;

        const rateCardQuery = getAllRateCardQuery(
            hierarchyIdCount,
            jobTemplateIdCount,
            startDate,
            endDate
        );
        const countQuery = getCountQuery(
            hierarchyIdCount,
            jobTemplateIdCount,
            startDate,
            endDate
        );

        const [rateCardResult, countResult] = await Promise.all([
            sequelize.query(rateCardQuery, {
                replacements: {
                    ...filters,
                    ...(startDate !== undefined && { startDate }),
                    ...(endDate !== undefined && { endDate }),
                },
                type: QueryTypes.SELECT,
            }),
            sequelize.query(countQuery, {
                replacements: {
                    ...filters,
                    ...(startDate !== undefined && { startDate }),
                    ...(endDate !== undefined && { endDate }),
                },
                type: QueryTypes.SELECT,
            }),
        ]);

        const totalRecords = (countResult[0] as { total: number })?.total ?? 0;

        if (rateCardResult.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Rate configs not found",
                rate_card: [],
                trace_id:traceId,
            });
        }

        const rateCardArray = rateCardResult.map((row: any) => {
            let expenses = [];
            try {
                const expensesString = JSON.stringify(row.expenses);
                expenses = JSON.parse(expensesString);
            } catch (parseError) {
                expenses = [];
            }
            const uniqueExpenses: any[] = [];
            const expenseSet = new Set();

            expenses.forEach((expense: any) => {
                const expenseKey = JSON.stringify(expense);
                if (!expenseSet.has(expenseKey)) {
                    expenseSet.add(expenseKey);
                    uniqueExpenses.push(expense);
                }
            });

            return {
                ...row,
                is_shift_rate: !!row.is_shift_rate,
                hierarchies: row.hierarchies ? JSON.parse(`[${row.hierarchies}]`) : [],
                job_templates: row.job_templates
                    ? JSON.parse(`[${row.job_templates}]`)
                    : [],
                expenses: uniqueExpenses,
            };
        });

        reply.status(200).send({
            status_code: 200,
            message: "Rate configs found",
            total_records: totalRecords,
            rate_card: rateCardArray,
            trace_id:traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal server error",
            error: error.message,
            trace_id:traceId,
        });
    }
}


function addArrayFilters(queryValue: string | undefined, filterKey: string, filters: Record<string, any>) {
    const ids = queryValue ? queryValue.split(',') : [];
    ids.forEach((id, index) => {
        filters[`${filterKey}_${index + 1}`] = id.trim();
    });
}


function transformRateCard(rateItem: any): any {
    const { rate_configuration, hierarchies, job_templates, is_shift_rate } = rateItem;

    return {
        ...rateItem,
        hierarchies: hierarchies ? JSON.parse(`[${hierarchies}]`) : [],
        job_templates: job_templates ? JSON.parse(`[${job_templates}]`) : [],
        rate_configuration: rate_configuration.map((config: any) => ({
            ...config,
            rates: config.rates.map((rateDetails: any) => transformRateDetails(rateDetails, config, is_shift_rate))
        }))
    };
}

function transformRateDetails(rateDetails: any, config: any, isShiftRate: boolean): any {
    const standardRate = config.rates.find((rate: any) => rate.rate_type_category === 'Standard');
    const standardMinRate = standardRate?.rate?.[0]?.min_rate ?? 0;
    const standardMaxRate = standardRate?.rate?.[0]?.max_rate ?? 0;

    if (rateDetails.rate_type_category !== 'Standard') {
        const adjustRates = isShiftRate
            ? adjustRatesForShift
            : adjustRatesForNonShift;

        adjustRates(rateDetails, standardMinRate, standardMaxRate);
    }
    return rateDetails;
}

function adjustRatesForNonShift(rateDetails: any, standardMin: number, standardMax: number): void {
    ['pay_rate', 'bill_rate'].forEach(rateKey => {
        const rate = rateDetails[rateKey]?.[0];
        if (rate) {
            if (rate.differential_type === 'Factor Differential') {
                rate.min_rate = standardMin * Number(rate.differential_value);
                rate.max_rate = standardMax * Number(rate.differential_value);
            } else {
                rate.min_rate = standardMin + Number(rate.differential_value);
                rate.max_rate = standardMax + Number(rate.differential_value);
            }
        }
    });
}

function adjustRatesForShift(rateDetails: any, standardMin: number, standardMax: number): void {
    const rate = rateDetails.rate?.[0];
    if (rate) {
        if (rate.differential_type === 'Factor Differential') {
            rate.min_rate = standardMin * Number(rate.differential_value);
            rate.max_rate = standardMax * Number(rate.differential_value);
        } else {
            rate.min_rate = standardMin + Number(rate.differential_value);
            rate.max_rate = standardMax + Number(rate.differential_value);
        }
    }
}

export const saveRateCard = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const RateCardConfigurationPayload = request.body as RateCardInterface;
    const transaction = await sequelize.transaction();
    const { program_id } = request.params as { program_id: string };

    try {
        if (!RateCardConfigurationPayload.name || !RateCardConfigurationPayload.hierarchies || !RateCardConfigurationPayload.job_templates) {
            return reply.status(400).send({
                status_code:400,
                message: 'Invalid request body',
                trace_id:traceId
            });
        }

        const existingRateCardByName = await RateCardModel.findOne({
            where: { program_id, name: RateCardConfigurationPayload.name, is_deleted: false },
            transaction
        });

        if (existingRateCardByName) {
            return reply.status(400).send({
                status_code: 400,
                message: `A rate configuration named ${RateCardConfigurationPayload.name} already exists`,
                trace_id:traceId
            });
        }

        const existingRateCardByHierarchiesAndTemplates = await RateCardModel.findOne({
            where: {
                program_id,
                hierarchies: { [Op.eq]: JSON.stringify(RateCardConfigurationPayload.hierarchies) },
                job_templates: { [Op.eq]: JSON.stringify(RateCardConfigurationPayload.job_templates) },
                is_deleted: false
            },
            transaction
        });

        if (existingRateCardByHierarchiesAndTemplates) {
            return reply.status(400).send({
                status_code: 400,
                message: 'A rate configuration with the same hierarchies and job templates already exists',
                trace_id:traceId
            });
        }

        const newRateCard = await RateCardModel.create({ ...RateCardConfigurationPayload, program_id }, { transaction });

        const newMappings = RateCardConfigurationPayload.hierarchies.map((id: string) => ({
            program_id: newRateCard.program_id,
            rate_card_config_id: newRateCard.id,
            hierarchy_id: id,
        }));
        await RateCardMapping.bulkCreate(newMappings, { transaction });

        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            success: true,
            message: 'Rate card configuration saved successfully',
            rate_card_config_id: newRateCard.id,
            trace_id:traceId
        });
    } catch (error) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while saving the rate card configuration',
            trace_id:traceId
        });
    }
};

export const updateRateCardById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    const RateCardConfigurationData = request.body as RateCardInterface;
    const transaction = await sequelize.transaction();
    try {
        const data = await RateCardModel.findOne({
            where: { id, program_id, is_deleted: false },
            transaction
        });
        if (!data) {
            return reply.status(200).send(
                {
                    status_code: 200,
                    message: 'Rate card config not found.',
                    trace_id:traceId
                }
            );
        }
        const UpdatedRateCardConfiguration = await data.update({RateCardConfigurationData,modified_on:Date.now()});
        const { hierarchies } = UpdatedRateCardConfiguration as any;
        if (hierarchies) {
            const existingMappings = await RateCardMapping.findAll({
                where: { program_id },
                attributes: ['hierarchy_id'],
                transaction
            });

            const existingMappingIds = existingMappings.map(mapping => mapping.hierarchy_id);
            const mappingsToAdd = hierarchies.filter((id: any) => !existingMappingIds.includes(id));
            const mappingsToRemove = existingMappingIds.filter(id => !hierarchies.includes(id));

            if (mappingsToRemove.length > 0) {
                await RateCardMapping.destroy(
                    {
                        where: {
                            rate_card_config_id: id,
                            program_id,
                            hierarchy_id: { [Op.in]: mappingsToRemove }
                        },
                        transaction
                    }
                );
            }

            if (mappingsToAdd.length > 0) {
                const newMappings = mappingsToAdd.map((id: any) => ({
                    program_id,
                    rate_card_config_id: id,
                    hierarchy_id: id,
                }));
                await RateCardMapping.bulkCreate(newMappings, { transaction });
            }
            await transaction.commit();
        }
        reply.send({
            success: true,
            message: 'Rate config and mappings updated successfully.',
            trace_id:traceId
        });
    } catch (error) {
        await transaction.rollback();
        reply.status(500).send({status_code:500, message: 'An error occurred while updating the rate config', trace_id :traceId});
    }
}

export const getRateCardById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { id } = request.params as { id: string };
    try {
        const rateCardResult = await sequelize.query(rateCardQuery, {
            replacements: {
                id,
            },
            type: QueryTypes.SELECT,
        });

        if (rateCardResult.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Rate config not found',
                rate_card: [],
                trace_id:traceId
            });
        }

        const rateCardArray = rateCardResult.map((row: any) => {
            let expenses = [];
            try {
                const expensesString = JSON.stringify(row.expenses);
                expenses = JSON.parse(expensesString);
            } catch (parseError) {
                expenses = [];
            }
            const uniqueExpenses: any[] = [];
            const expenseSet = new Set();
            expenses.forEach((expense: any) => {
                const expenseKey = JSON.stringify(expense);
                if (!expenseSet.has(expenseKey)) {
                    expenseSet.add(expenseKey);
                    uniqueExpenses.push(expense);
                }
            });

            return {
                ...row,
                is_shift_rate: !!row.is_shift_rate,
                hierarchies: row.hierarchies ? JSON.parse(`[${row.hierarchies}]`) : [],
                job_templates: row.job_templates ? JSON.parse(`[${row.job_templates}]`) : [],
                expenses: uniqueExpenses
            };
        });

        reply.status(200).send({
            status_code: 200,
            message: 'Rate config found',
            rate_card: rateCardArray,
            trace_id:traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            error: error.message,
            trace_id:traceId
        });
    }
};

export async function deleteRateCardById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        const rateCard = await RateCardModel.findByPk(id);
        if (rateCard) {
            await rateCard.update({
                is_enabled: false,
                is_deleted: true,
            })
            reply.status(200).send({
                status_code: 200,
                message: 'Rate config deleted successfully',
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Rate config not found',
                trace_id:traceId
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id:traceId
        });
    }
}

export async function getRateType(
    request: FastifyRequest<{ Params: RateCardInterface, Querystring: RateCardInterface }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params as Partial<RateCardInterface>;
        const query = request.query as any;

        const page = parseInt(query.page ?? '1');
        const limit = parseInt(query.limit ?? '10');
        const offset = (page - 1) * limit;

        const filters: any = {
            program_id: params.program_id,
            limit,
            offset,
            is_enabled: query.is_enabled !== undefined ? query.is_enabled === 'true' : null,
            is_shift_rate: query.is_shift_rate !== undefined ? query.is_shift_rate : null,
        };

        const hierarchyIds = query.hierarchy_id ? query.hierarchy_id.split(',') : [];
        hierarchyIds.forEach((id: any, index: number) => {
            filters[`hierarchy_id_${index + 1}`] = id;
        });

        const jobTemplateIds = query.job_template_id ? query.job_template_id.split(',') : [];
        jobTemplateIds.forEach((id: any, index: number) => {
            filters[`job_template_id_${index + 1}`] = id;
        });

        const rateTypeQuery = rateTypeConfigQuery(hierarchyIds.length, jobTemplateIds.length);

        const [rateTypeResult] = await Promise.all([
            sequelize.query(rateTypeQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
            })
        ]);

        if (rateTypeResult.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Rate type not found",
                rate_types: [],
                trace_id:traceId
            });
        }
        reply.status(200).send({
            status_code: 200,
            rate_types: rateTypeResult,
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id:traceId
        });
    }
}

export async function getShiftTypes(
    request: FastifyRequest<{ Params: { program_id: string }, Querystring: { hierarchy_ids?: string, job_template_ids?: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const program_id = request.params.program_id;
    const { job_template_ids, hierarchy_ids } = request.query;

    if (!job_template_ids || !hierarchy_ids) {
        return reply.status(400).send({
            status_code: 400,
            message: 'Missing required query parameters: job_template_ids and hierarchy_ids are both required.',
            trace_id:traceId
        });
    }

    try {
        const filters: any = {
            is_deleted: 0,
            is_enabled: 1,
            is_shift_rate: 1,
            program_id: program_id
        };

        const hierarchyIdsArray = hierarchy_ids.split(',');
        const jobTemplateIdsArray = job_template_ids.split(',');

        const shiftTypesQuery = `
            SELECT rate_configuration
            FROM rate_card_configuration
            WHERE is_deleted = :is_deleted
              AND is_enabled = :is_enabled
              AND is_shift_rate = :is_shift_rate
              AND program_id = :program_id
              AND JSON_CONTAINS(hierarchies, JSON_ARRAY(${hierarchyIdsArray.map(id => `"${id}"`).join(',')}))
              AND JSON_CONTAINS(job_templates, JSON_ARRAY(${jobTemplateIdsArray.map(id => `"${id}"`).join(',')}))
        `;

        const shiftTypeResult = await sequelize.query(shiftTypesQuery, {
            replacements: filters,
            type: QueryTypes.SELECT,
        });
        if (shiftTypeResult.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Shift types not found",
                shift_types: [],
                trace_id:traceId
            });
        }

        const shiftTypes = Array.from(new Set(
            shiftTypeResult.flatMap((row: any) =>
                row.rate_configuration?.map((config: any) => config.shift_type)
            ).filter((shiftType: any) => shiftType !== null)
        ));

        reply.status(200).send({
            status_code: 200,
            message: "Shift types found",
            shift_types: shiftTypes,
            trace_id:traceId,
        });

    } catch (error) {
        console.error('Error fetching shift types:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id:traceId
        });
    }
}

const getHierarchyPath = async (hierarchyId: string): Promise<hierarchies[]> => {
    const path: hierarchies[] = [];
    let currentHierarchy = await hierarchies.findByPk(hierarchyId);

    while (currentHierarchy) {
        path.push(currentHierarchy);
        if (currentHierarchy.parent_hierarchy_id) {
            currentHierarchy = await hierarchies.findByPk(currentHierarchy.parent_hierarchy_id);
        } else {
            break;
        }
    }

    return path.reverse();
};

export const getMinMaxRatesByParams = async (
    request: FastifyRequest<{ Querystring: { job_template_id: string; currency: string; unit_of_measure: string; hierarchy_ids: string, is_shift_rate: boolean; }, Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { job_template_id, currency, unit_of_measure, hierarchy_ids, is_shift_rate } = request.query;
    const { program_id } = request.params;
    if (!job_template_id || !currency || !unit_of_measure || !hierarchy_ids) {
        return reply.status(400).send({
            status_code: 400,
            message: 'Missing required query parameters: job_template_id, currency, unit_of_measure, and hierarchy_ids are all required.',
            trace_id: traceId,
        });
    }
    try {
        const hierarchyIdsArray = hierarchy_ids.split(',');
        const hierarchyIdsJSON = JSON.stringify(hierarchyIdsArray);
        const minMaxRateResult = await sequelize.query<MinMaxRateResult>(minMaxRateQuery({
            hierarchyIdsJSON,
            jobTemplateId: job_template_id,
            currency,
            programId: program_id,
            unit_of_measure,
            is_shift_rate
        }), {
            type: QueryTypes.SELECT,
        });

        const rateModels = await Promise.all(
            hierarchyIdsArray.map(async (id) => {
                const hierarchy = await hierarchies.findByPk(id);
                return hierarchy?.rate_model;
            })
        );

        const firstRateModel = rateModels[0];
        let rate_model;
        const allSameRateModel = rateModels.every(rateModel => rateModel === firstRateModel);
        if (allSameRateModel) {
            rate_model = rateModels[0];
        }
        else {
            const paths = await Promise.all(
                hierarchyIdsArray.map(id => getHierarchyPath(id))
            );

            let commonAncestor = null;
            for (let i = 0; i < paths[0].length; i++) {
                const currentNode = paths[0][i];
                if (paths.every(path => path[i]?.id === currentNode.id && path[i]?.program_id === program_id)) {
                    commonAncestor = currentNode;
                } else {
                    break;
                }
            }
            rate_model = commonAncestor?.rate_model;
        }
        if (minMaxRateResult.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No min rate and max rate found!',
                trace_id: traceId,
                result: {
                    min_rate: null,
                    max_rate: null,
                    rate_model: rate_model || null
                }
            });
        }

        const finalResult: MinMaxRateResult = {
            min_rate: minMaxRateResult[0]?.min_rate || null,
            max_rate: minMaxRateResult[0]?.max_rate || null,
            rate_model: rate_model ?? null
        };

        reply.status(200).send({
            status_code: 200,
            message: 'Min rate and max rate found successfully!',
            trace_id: traceId,
            result: finalResult
        });

    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
        });
    }
};
