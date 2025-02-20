import { FastifyRequest, FastifyReply } from 'fastify';
import RateConfigurationsModel from '../models/rate-configurations.model';
import { RateConfigurationsInterface } from '../interfaces/rate-configurations.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import RateConfigurationHierarchies from '../models/rate_configuration_hierarchies.model';
import RateConfigurationJobTemplates from '../models/rate-configuration-job-templates.model';
import RateConfigurationBaseRateTypes from '../models/rate-configuration-base-rate-types.model';
import RateConfigurationRateTypes from '../models/rate-configuration-rate-types.model';
import RateConfigurationRateDifferentials from '../models/rate-configuration-rate-differentials.model';
import { sequelize } from '../config/instance';
import jobTemplateModel from '../models/job-template.model';
import rateType from '../models/rate-type.model';
import hierarchies from '../models/hierarchies.model';
import picklistItemModel from '../models/picklist-item.model';
import { getAllRateConfigurationsQuery, rateCardMinRateMaxRate, rateConfigHierarchiesAndJobTemplates, sameHierarchieRateConfiguration, sameRateConfiguration } from '../utility/queries';
import { QueryTypes } from 'sequelize';
import { decodeToken } from '../middlewares/verifyToken';
import ShiftType from '../models/shift-type.model';

export const createRateConfigurations = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const rateConfigurationsPayload = request.body as Partial<RateConfigurationsInterface>;
    const transaction = await sequelize.transaction();
    const authHeader = request.headers.authorization;
    try {
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;
        if (rateConfigurationsPayload.hierarchies && rateConfigurationsPayload.job_templates) {
            const existingConfigurations = await sequelize.query(sameRateConfiguration, {
                replacements: {
                    program_id,
                    hierarchies: rateConfigurationsPayload.hierarchies || [],
                    job_templates: rateConfigurationsPayload.job_templates || []
                },
                type: QueryTypes.SELECT,
                transaction
            });

            if (existingConfigurations.length > 0) {
                await transaction.rollback();
                return reply.status(409).send({
                    status_code: 409,
                    message: 'Rate configurations with the same hierarchy and job template already exist.',
                    trace_id: traceId,
                });
            }
        }
        const rateData = await RateConfigurationsModel.create({
            program_id,
            name: rateConfigurationsPayload.name,
            is_shift_rate: rateConfigurationsPayload.is_shift_rate,
            created_by: userId,
            modified_by: userId
        }, { transaction });

        if (rateConfigurationsPayload.hierarchies) {
            for (const hierarchyId of rateConfigurationsPayload.hierarchies) {
                if (hierarchyId) {
                    await RateConfigurationHierarchies.create({
                        rate_configuration_id: rateData.id,
                        hierarchy_id: hierarchyId,
                    }, { transaction });
                }
            }
        }

        if (rateConfigurationsPayload.job_templates) {
            for (const jobTemplateId of rateConfigurationsPayload.job_templates) {
                if (jobTemplateId) {
                    await RateConfigurationJobTemplates.create({
                        rate_configuration_id: rateData.id,
                        job_template_id: jobTemplateId,
                    }, { transaction });
                }
            }
        }

        const baseRatePayloads = rateConfigurationsPayload.rate_configuration || [];
        for (const baseRatePayload of baseRatePayloads) {
            const baseRate = baseRatePayload.base_rate;
            if (baseRate?.rate_type_id) {
                const baseRateResult = await RateConfigurationBaseRateTypes.create({
                    rate_configuration_id: rateData.id,
                    rate_type_id: baseRate.rate_type_id,
                }, { transaction });

                const rates = baseRatePayload.rate || [];
                for (const rate of rates) {
                    if (rate.rate_type_id) {
                        const rateTypeRecord = await RateConfigurationRateTypes.create({
                            base_rate_type_id: baseRateResult.id,
                            rate_type_id: rate.rate_type_id,
                        }, { transaction });

                        if (Array.isArray(rate.bill_rate)) {
                            for (const billRate of rate.bill_rate) {
                                await RateConfigurationRateDifferentials.create({
                                    rate_id: rateTypeRecord.id,
                                    differential_on: billRate.differential_on,
                                    differential_type: billRate.differential_type,
                                    differential_value: billRate.differential_value,
                                    unit_of_measure: billRate.unit_of_measure,
                                    currency: billRate.currency,
                                    type: 'BILL_RATE',
                                }, { transaction });
                            }
                        }
                        if (Array.isArray(rate.bill_rate)) {
                            for (const payRate of rate.pay_rate) {
                                await RateConfigurationRateDifferentials.create({
                                    rate_id: rateTypeRecord.id,
                                    differential_on: payRate.differential_on,
                                    differential_type: payRate.differential_type,
                                    differential_value: payRate.differential_value,
                                    unit_of_measure: payRate.unit_of_measure,
                                    currency: payRate.currency,
                                    type: 'PAY_RATE',
                                }, { transaction });
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            message: 'Rate configurations created successfully.',
            rate_type_category_id: rateData.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating rate configurations.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const updateRateConfigurations = async (
    request: FastifyRequest<{ Params: { program_id: string; id: string }; Body: Partial<RateConfigurationsInterface> }>,
    reply: FastifyReply
) => {
    const { program_id, id } = request.params;
    const rateConfigurationsPayload = request.body;
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    const authHeader = request.headers.authorization;
    try {
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }

        const userId = user?.sub;
        const existingRateConfig = await RateConfigurationsModel.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!existingRateConfig) {
            return reply.status(404).send({
                message: 'Rate configurations not found.',
                trace_id: traceId,
            });
        }
        if (rateConfigurationsPayload.hierarchies && rateConfigurationsPayload.job_templates) {
            const existingConfigurations = await sequelize.query(sameHierarchieRateConfiguration, {
                replacements: {
                    program_id,
                    hierarchies: rateConfigurationsPayload.hierarchies || [],
                    job_templates: rateConfigurationsPayload.job_templates || [],
                    id
                },
                type: QueryTypes.SELECT,
                transaction
            });

            if (existingConfigurations.length > 0) {
                await transaction.rollback();
                return reply.status(409).send({
                    status_code: 409,
                    message: 'Rate configurations with the same hierarchy and job template already exist.',
                    trace_id: traceId,
                });
            }
        }
        await existingRateConfig.update(
            {
                name: rateConfigurationsPayload.name,
                is_shift_rate: rateConfigurationsPayload.is_shift_rate,
                modified_on: Date.now(),
                is_enabled: rateConfigurationsPayload.is_enabled,
                modified_by: userId
            },
            { transaction }
        );

        if (rateConfigurationsPayload.hierarchies) {
            await RateConfigurationHierarchies.destroy({
                where: { rate_configuration_id: id },
                transaction,
            });

            await Promise.all(
                rateConfigurationsPayload.hierarchies.map((hierarchyId: any) =>
                    RateConfigurationHierarchies.create(
                        { rate_configuration_id: id, hierarchy_id: hierarchyId },
                        { transaction }
                    )
                )
            );
        }

        if (rateConfigurationsPayload.job_templates) {
            await RateConfigurationJobTemplates.destroy({
                where: { rate_configuration_id: id },
                transaction,
            });

            await Promise.all(
                rateConfigurationsPayload.job_templates.map((jobTemplateId: any) =>
                    RateConfigurationJobTemplates.create(
                        { rate_configuration_id: id, job_template_id: jobTemplateId },
                        { transaction }
                    )
                )
            );
        }

        if (rateConfigurationsPayload.rate_configuration) {
            await RateConfigurationBaseRateTypes.destroy({
                where: { rate_configuration_id: id },
                transaction,
            });

            for (const baseRatePayload of rateConfigurationsPayload.rate_configuration) {
                const { base_rate, rate } = baseRatePayload;

                let baseRateResult;
                if (base_rate) {
                    [baseRateResult] = await RateConfigurationBaseRateTypes.upsert(
                        {
                            id: base_rate.id,
                            rate_configuration_id: id,
                            rate_type_id: base_rate.rate_type_id,
                        },
                        { transaction }
                    );
                }

                if (rate && Array.isArray(rate)) {
                    await RateConfigurationRateTypes.destroy({
                        where: { base_rate_type_id: baseRateResult?.id },
                        transaction,
                    });

                    for (const rateItem of rate) {
                        const [rateTypeRecord] = await RateConfigurationRateTypes.upsert(
                            {
                                id: rateItem.id,
                                base_rate_type_id: baseRateResult?.id,
                                rate_type_id: rateItem.rate_type_id,
                            },
                            { transaction }
                        );

                        if (Array.isArray(rateItem.bill_rate)) {
                            await RateConfigurationRateDifferentials.destroy({
                                where: { rate_id: rateTypeRecord?.id, type: 'BILL_RATE' },
                                transaction,
                            });
                            for (const billRate of rateItem.bill_rate) {
                                await RateConfigurationRateDifferentials.upsert(
                                    {
                                        id: billRate.id,
                                        rate_id: rateTypeRecord.id,
                                        differential_on: billRate.differential_on,
                                        differential_type: billRate.differential_type,
                                        differential_value: billRate.differential_value,
                                        unit_of_measure: billRate.unit_of_measure,
                                        currency: billRate.currency,
                                        type: 'BILL_RATE',
                                    },
                                    { transaction }
                                );
                            }
                        }

                        if (Array.isArray(rateItem.pay_rate)) {
                            await RateConfigurationRateDifferentials.destroy({
                                where: { rate_id: rateTypeRecord?.id, type: 'PAY_RATE' },
                                transaction,
                            });
                            for (const payRate of rateItem.pay_rate) {
                                await RateConfigurationRateDifferentials.upsert(
                                    {
                                        id: payRate.id,
                                        rate_id: rateTypeRecord.id,
                                        differential_on: payRate.differential_on,
                                        differential_type: payRate.differential_type,
                                        differential_value: payRate.differential_value,
                                        unit_of_measure: payRate.unit_of_measure,
                                        currency: payRate.currency,
                                        type: 'PAY_RATE',
                                    },
                                    { transaction }
                                );
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();

        reply.status(200).send({
            status_code: 200,
            message: 'Rate configurations updated successfully.',
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            message: 'An error occurred while updating the rate configurations.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const deleteRateConfigurations = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const data = await RateConfigurationsModel.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({
                message: 'Rate configurations data not found.',
                trace_id: traceId,
                rate_configurations: []
            });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            rate_type_category_id: id,
            trace_id: traceId,
            message: 'Rate configurations deleted successfully.'
        });
    } catch (error: any) {
        reply.status(500).send({
            message: 'Error deleting rate configurations ',
            error: error.message,
            trace_id: traceId
        });
    }
}

export async function getAllRateConfigurations(
    request: FastifyRequest<{ Params: { program_id: string }; Querystring: { name?: string; is_enabled?: string; is_shift_rate?: string; job_template_id?: string; hierarchy_id?: string; rate_type?: string; modified_on?: string; page?: string; limit?: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const query = request.query;

        const page = parseInt(query.page ?? "1", 10);
        const limit = parseInt(query.limit ?? "10", 10);
        const offset = (page - 1) * limit;

        const isEnabled = parseBoolean(query.is_enabled);
        const isShiftRate = parseBoolean(query.is_shift_rate);
        const { startDate, endDate } = parseDateRange(query.modified_on);

        const replacements: any = {
            program_id,
            name: query.name ?? null,
            job_template_id: query.job_template_id ?? null,
            hierarchy_id: query.hierarchy_id ?? null,
            rate_type: query.rate_type ?? null,
            is_enabled: isEnabled,
            is_shift_rate: isShiftRate,
            startDate,
            endDate,
            limit,
            offset,
        };

        const rateConfigurationsWithDetails: { base_rates?: { id: string; name: string; rate_types?: { id: string; name: string }[] }[] }[] = await getAllRateConfigurationsQuery(replacements);

        const result = await sequelize.query<{ total_count: any }>(
            `SELECT COUNT(*) AS total_count FROM rate_configurations AS rc WHERE rc.is_deleted = 0 AND rc.program_id = :program_id`,
            {
                replacements: { program_id: replacements.program_id },
                type: QueryTypes.SELECT,
            }
        );

        const totalCount = result[0]?.total_count ?? 0;

        if (!rateConfigurationsWithDetails.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Rate configurations not found.",
                trace_id: traceId,
                rate_configurations: [],
            });
        }

        const transformedData = rateConfigurationsWithDetails.map((config) => ({
            ...config,
            base_rates: config.base_rates?.flatMap((rate) => [
                { id: rate.id, name: rate.name },
                ...(rate.rate_types ?? []).map((type) => ({
                    id: type.id,
                    name: type.name,
                })),
            ]) ?? [],
        }));

        return reply.status(200).send({
            status_code: 200,
            message: "Rate configurations fetched successfully.",
            trace_id: traceId,
            items_per_page: limit,
            total_records: totalCount,
            rate_configurations: transformedData,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error.message,
            trace_id: traceId,
        });
    }
}

function parseBoolean(value: any): number | undefined {
    if (typeof value === "string") {
        return value.toLowerCase() === "true" ? 1 : 0;
    }
    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }
    return undefined;
}

function parseDateRange(dateRange: string | undefined): { startDate?: string; endDate?: string } {
    if (!dateRange) return {};
    const dates = dateRange.split(",");
    if (dates.length === 2) {
        return {
            startDate: dates[0],
            endDate: dates[1],
        };
    }
    return {};
}

export async function getRateConfigurationById(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };

        const rateConfiguration = await RateConfigurationsModel.findOne({
            where: { program_id, id },
            attributes: ['id', 'program_id', 'name', 'is_shift_rate', 'is_enabled', 'created_on', 'modified_on'],
        });

        if (!rateConfiguration) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'Rate configuration not found.',
                rate_configurations: null,
            });
        }

        const hierarchie = await RateConfigurationHierarchies.findAll({
            where: { rate_configuration_id: id },
            include: [
                {
                    model: hierarchies,
                    as: 'hierarchy',
                    attributes: ['id', 'name'],
                },
            ],
        }).then((data) => data.map((item) => item.hierarchy));

        const jobTemplates = await RateConfigurationJobTemplates.findAll({
            where: { rate_configuration_id: id },
            include: [
                {
                    model: jobTemplateModel,
                    as: 'job_template',
                    attributes: ['id', 'template_name'],
                },
            ],
        }).then((data) =>
            data.map((item) => ({
                id: item.job_template?.id,
                name: item.job_template?.template_name,
            }))
        );

        const baseRates = await RateConfigurationBaseRateTypes.findAll({
            where: { rate_configuration_id: id },
            include: [
                {
                    model: rateType,
                    as: 'rate_type',
                    attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type', 'rate'],
                },
            ],
        });

        const rateConfigurationDetails = await Promise.all(
            baseRates.map(async (baseRate) => {
                const rateTypeCategory = baseRate.rate_type?.rate_type_category
                    ? await picklistItemModel.findOne({
                        where: { id: baseRate.rate_type.rate_type_category },
                        attributes: ['id', 'value', 'label'],
                    })
                    : null;

                const rates = await RateConfigurationRateTypes.findAll({
                    where: { base_rate_type_id: baseRate.id },
                    include: [
                        {
                            model: rateType,
                            as: 'rate_type',
                            attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type'],
                        },
                    ],
                });

                const rateDetails = await Promise.all(
                    rates.map(async (rate) => {
                        const rateTypeCategory = rate.rate_type?.rate_type_category
                            ? await picklistItemModel.findOne({
                                where: { id: rate.rate_type.rate_type_category },
                                attributes: ['id', 'value', 'label'],
                            })
                            : null;

                        const billRates = await RateConfigurationRateDifferentials.findAll({
                            where: { rate_id: rate.id, type: 'BILL_RATE' },
                            attributes: ['differential_on', 'differential_type', 'differential_value', 'type', 'unit_of_measure', 'currency'],
                        });

                        const payRates = await RateConfigurationRateDifferentials.findAll({
                            where: { rate_id: rate.id, type: 'PAY_RATE' },
                            attributes: ['differential_on', 'differential_type', 'differential_value', 'type', 'unit_of_measure', 'currency'],
                        });

                        return {
                            rate_type: rate.rate_type
                                ? {
                                    ...rate.rate_type.get(),
                                    rate_type_category: rateTypeCategory,
                                }
                                : null,
                            bill_rate: billRates,
                            pay_rate: payRates,
                        };
                    })
                );

                return {
                    base_rate: baseRate.rate_type
                        ? {
                            ...baseRate.rate_type.get(),
                            rate_type_category: rateTypeCategory,
                        }
                        : null,
                    rate: rateDetails,
                };
            })
        );

        const response = {
            program_id: rateConfiguration.program_id,
            name: rateConfiguration.name,
            is_enabled: rateConfiguration.is_enabled,
            is_shift_rate: rateConfiguration.is_shift_rate,
            created_on: rateConfiguration.created_on,
            modified_on: rateConfiguration.modified_on,
            hierarchie,
            job_templates: jobTemplates,
            rate_configuration: rateConfigurationDetails,
        };

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Rate configuration fetched successfully.',
            rate_configurations: response,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'An error occurred while fetching rate configurations.',
            error: error.message,
        });
    }
}

export async function getAllRateConfigurationRates(request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: {
        hierarchie_id?: string;
        job_templates?: string;
        is_shift_rate?: boolean;
        currency_id?: string;
        unit_of_measure?: string;
        labor_category_id?: string;
        ot_exempt?: string;
    };
}>, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { hierarchie_id, job_templates, is_shift_rate, currency_id, unit_of_measure, labor_category_id, ot_exempt } = request.query;

        const hierarchyIds = hierarchie_id ? hierarchie_id.split(',') : [];
        const jobTemplateIds = job_templates ? job_templates.split(',') : [];

        const hierarchyRecords = await RateConfigurationHierarchies.findAll({
            where: { hierarchy_id: hierarchyIds },
            attributes: ['rate_configuration_id'],
        });

        const jobTemplateRecords = await RateConfigurationJobTemplates.findAll({
            where: { job_template_id: jobTemplateIds },
            attributes: ['rate_configuration_id'],
        });

        const rateConfigurationIdsFromHierarchies = hierarchyRecords.map(record => record.rate_configuration_id);
        const rateConfigurationIdsFromJobTemplates = jobTemplateRecords.map(record => record.rate_configuration_id);

        const finalRateConfigurationIds = rateConfigurationIdsFromHierarchies.filter(id =>
            rateConfigurationIdsFromJobTemplates.includes(id)
        );

        const rateConfigurations = await RateConfigurationsModel.findAll({
            where: { program_id, id: finalRateConfigurationIds, is_shift_rate, is_enabled: true, is_deleted: false },
            attributes: ['id', 'program_id', 'name', 'is_shift_rate'],
        });

        if (!rateConfigurations.length) {
            const standardBaseRate = await rateType.findAll({
                where: { is_base_rate: true, program_id, is_enabled: true, is_deleted: false, is_shift_rate },
                attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type'],
                order: [['created_on', 'ASC']]
            });

            if (!standardBaseRate) {
                return reply.status(400).send({
                    status_code: 400,
                    trace_id: traceId,
                    message: 'No rate configurations found and no standard base rate available.',
                    rate_configurations: [],
                });
            }
            const hierarchyDetails = await hierarchies.findAll({
                where: { id: hierarchyIds },
                attributes: ['id', 'name'],
            });

            if (hierarchyDetails.length === 0) {
                throw new Error("Hierarchies not found.");
            }

            const rateCardDecisionRecords: Array<{
                id: string;
                rate_card_id: string;
                rate_type_id: string;
                hierarchy_id: string;
                min_rate: { amount: number, is_changeable: boolean, is_reduceable: boolean };
                max_rate: { amount: number, is_changeable: boolean, is_reduceable: boolean };
                job_template_id: string;
                unit_of_measure: string;
                currency: string;
            }> = await sequelize.query(rateCardMinRateMaxRate, {
                replacements: {
                    hierarchyIds: hierarchyIds,
                    jobTemplateIds: jobTemplateIds,
                    unit_of_measure,
                    currency_id,
                    labor_category_id,
                    program_id
                },
                type: QueryTypes.SELECT,
            });

            let matchingDecisionRecords = rateCardDecisionRecords.filter(record =>
                hierarchyIds.includes(record.hierarchy_id)
            );

            if (matchingDecisionRecords.length === 0) {
                matchingDecisionRecords = rateCardDecisionRecords.filter(record =>
                    record.hierarchy_id === null
                );
            }

            let minRateRecord = matchingDecisionRecords.length
                ? matchingDecisionRecords.reduce((prev, curr) => (curr.min_rate.amount < prev.min_rate.amount ? curr : prev))
                : null;

            let maxRateRecord = matchingDecisionRecords.length
                ? matchingDecisionRecords.reduce((prev, curr) => (curr.max_rate.amount > prev.max_rate.amount ? curr : prev))
                : null;

            const matchingDecisionRecord = {
                min_rate: minRateRecord
                    ? {
                        amount: minRateRecord.min_rate.amount,
                        is_changeable: minRateRecord.min_rate.is_changeable,
                        is_reduceable: minRateRecord.min_rate.is_reduceable
                    }
                    : { amount: 0, is_changeable: true, is_reduceable: false },

                max_rate: maxRateRecord
                    ? {
                        amount: maxRateRecord.max_rate.amount,
                        is_changeable: maxRateRecord.max_rate.is_changeable,
                        is_reduceable: maxRateRecord.max_rate.is_reduceable
                    }
                    : { amount: 0, is_changeable: true, is_reduceable: false }
            };

            const rateConfigurations = await Promise.all(standardBaseRate.map(async (standardBaseRate) => {
                const rateTypeCategory = standardBaseRate.rate_type_category
                    ? await picklistItemModel.findOne({
                        where: { id: standardBaseRate.rate_type_category },
                        attributes: ['id', 'value', 'label'],
                    })
                    : null;

                const shiftType = standardBaseRate.shift_type
                    ? await ShiftType.findOne({
                        where: { id: standardBaseRate.shift_type },
                        attributes: ['id', 'shift_type_name', 'shift_format', 'time_duration', 'shift_type_time'],
                    })
                    : null;

                return {
                    base_rate: {
                        rate_type: {
                            ...standardBaseRate.get(),
                            shift_type: shiftType,
                            rate_type_category: rateTypeCategory,
                            min_rate: matchingDecisionRecord.min_rate,
                            max_rate: matchingDecisionRecord.max_rate,
                        },
                        rates: [],
                    },
                    rate: []
                };
            }));

            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'Rate configurations fetched successfully.',
                rate_configurations: [{
                    name: standardBaseRate[0].name,
                    is_shift_rate: false,
                    hierarchies: hierarchyDetails,
                    rate_configurations: rateConfigurations
                }],
            });
        }

        const responses = await Promise.all(rateConfigurations.map(async (rateConfiguration) => {
            const hierarchie = await RateConfigurationHierarchies.findAll({
                where: { rate_configuration_id: rateConfiguration.id, hierarchy_id: hierarchyIds },
                include: [{ model: hierarchies, as: 'hierarchy', attributes: ['id', 'name'] }],
            });

            const extractedHierarchyIds = hierarchie.map((item) => item.hierarchy?.id).filter(Boolean);

            const uniqueHierarchies = Array.from(
                new Set(
                    hierarchie
                        .map(item => item.hierarchy && JSON.stringify({ id: item.hierarchy.id, name: item.hierarchy.name }))
                        .filter(Boolean)
                )
            ).map(item => JSON.parse(item));

            const rateCardDecisionRecords: Array<{
                id: string;
                rate_card_id: string;
                rate_type_id: string;
                hierarchy_id: string;
                min_rate: { amount: number, is_changeable: boolean, is_reduceable: boolean };
                max_rate: { amount: number, is_changeable: boolean, is_reduceable: boolean };
                job_template_id: string;
                unit_of_measure: string;
                currency: string;
            }> = await sequelize.query(rateCardMinRateMaxRate, {
                replacements: {
                    hierarchyIds: extractedHierarchyIds,
                    jobTemplateIds,
                    unit_of_measure,
                    currency_id,
                    labor_category_id,
                    program_id
                },
                type: QueryTypes.SELECT,
            });

            let matchingDecisionRecords = rateCardDecisionRecords.filter(record =>
                extractedHierarchyIds.includes(record.hierarchy_id)
            );

            if (matchingDecisionRecords.length === 0) {
                matchingDecisionRecords = rateCardDecisionRecords.filter(record =>
                    record.hierarchy_id === null
                );
            }

            let minRateRecord = matchingDecisionRecords.length
                ? matchingDecisionRecords.reduce((prev, curr) => (curr.min_rate.amount < prev.min_rate.amount ? curr : prev))
                : null;

            let maxRateRecord = matchingDecisionRecords.length
                ? matchingDecisionRecords.reduce((prev, curr) => (curr.max_rate.amount > prev.max_rate.amount ? curr : prev))
                : null;

            const matchingDecisionRecord = {
                min_rate: minRateRecord
                    ? {
                        amount: minRateRecord.min_rate.amount,
                        is_changeable: minRateRecord.min_rate.is_changeable,
                        is_reduceable: minRateRecord.min_rate.is_reduceable
                    }
                    : { amount: 0, is_changeable: true, is_reduceable: false },

                max_rate: maxRateRecord
                    ? {
                        amount: maxRateRecord.max_rate.amount,
                        is_changeable: maxRateRecord.max_rate.is_changeable,
                        is_reduceable: maxRateRecord.max_rate.is_reduceable
                    }
                    : { amount: 0, is_changeable: true, is_reduceable: false }
            };

            const baseRates = await RateConfigurationBaseRateTypes.findAll({
                where: { rate_configuration_id: rateConfiguration.id },
                include: [{
                    model: rateType,
                    as: 'rate_type',
                    where: { is_base_rate: true },
                    attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type'],
                }],
            });

            const rateConfigurationDetails = await Promise.all(baseRates.map(async (baseRate) => {
                const rateTypeCategory = baseRate.rate_type?.rate_type_category
                    ? await picklistItemModel.findOne({
                        where: { id: baseRate.rate_type.rate_type_category },
                        attributes: ['id', 'value', 'label'],
                    })
                    : null;

                const shiftType = baseRate.rate_type?.shift_type
                    ? await ShiftType.findOne({
                        where: { id: baseRate.rate_type.shift_type },
                        attributes: ['id', 'shift_type_name', 'shift_format', 'time_duration', 'shift_type_time'],
                    })
                    : null;

                const rates = await RateConfigurationRateTypes.findAll({
                    where: { base_rate_type_id: baseRate.id },
                    include: [{
                        model: rateType,
                        as: 'rate_type',
                        where: { is_base_rate: false },
                        attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type'],
                    }],
                });

                const rateDetails = await Promise.all(rates.map(async (rate: { rate_type: { rate_type_category: any; shift_type: any; get: () => any; }; id: any; }) => {
                    const rateTypeCategory = rate.rate_type?.rate_type_category
                        ? await picklistItemModel.findOne({
                            where: { id: rate.rate_type?.rate_type_category },
                            attributes: ['id', 'value', 'label'],
                        })
                        : null;

                    const shiftType = rate.rate_type?.shift_type
                        ? await ShiftType.findOne({
                            where: { id: rate.rate_type.shift_type },
                            attributes: ['id', 'shift_type_name', 'shift_format', 'time_duration', 'shift_type_time'],
                        })
                        : null;

                    const billRates = await RateConfigurationRateDifferentials.findAll({
                        where: { rate_id: rate.id, type: 'BILL_RATE' },
                        attributes: ['differential_on', 'differential_type', 'differential_value'],
                    });

                    const payRates = await RateConfigurationRateDifferentials.findAll({
                        where: { rate_id: rate.id, type: 'PAY_RATE' },
                        attributes: ['differential_on', 'differential_type', 'differential_value'],
                    });

                    const bill_rate = billRates.map((billRate) => {
                        const differential_value = ot_exempt == 'true'
                            ? 1
                            : billRate.differential_value;

                        return {
                            ...billRate.get(),
                            differential_value,
                            min_rate: (billRate.differential_type === "Factor Differential"
                                ? matchingDecisionRecord.min_rate.amount * differential_value
                                : matchingDecisionRecord.min_rate.amount + differential_value
                            ).toString(),

                            max_rate: (billRate.differential_type === "Factor Differential"
                                ? matchingDecisionRecord.max_rate.amount * differential_value
                                : matchingDecisionRecord.max_rate.amount + differential_value
                            ).toString(),
                        };
                    });

                    const pay_rate = payRates.map((payRate) => {
                        const differential_value = ot_exempt
                            ? 1
                            : payRate.differential_value;

                        return {
                            ...payRate.get(),
                            differential_value,
                            min_rate: (payRate.differential_type === "Factor Differential"
                                ? matchingDecisionRecord.min_rate.amount * differential_value
                                : matchingDecisionRecord.min_rate.amount + differential_value
                            ).toString(),

                            max_rate: (payRate.differential_type === "Factor Differential"
                                ? matchingDecisionRecord.max_rate.amount * differential_value
                                : matchingDecisionRecord.max_rate.amount + differential_value
                            ).toString(),
                        };
                    });

                    return {
                        rate_type: {
                            ...rate.rate_type?.get(),
                            rate_type_category: rateTypeCategory,
                            shift_type: shiftType,
                        },
                        bill_rate: bill_rate,
                        pay_rate: pay_rate
                    };
                }));

                const filteredRateType = rateDetails.filter((rate) =>
                    rate.rate_type?.rate_type_category?.value !== 'shift' &&
                    rate.bill_rate.some((billRate) => billRate.differential_on === rateTypeCategory?.value)
                );

                const filteredRate = rateDetails.filter((rate) => rate.rate_type?.is_base_rate === false && rate.rate_type?.rate_type_category?.value === 'shift').map((rate) => ({
                    ...rate,
                    rates: filteredRateType
                        .filter((filteredRate) =>
                            filteredRate.bill_rate[0].differential_on === 'shift' && filteredRate.pay_rate[0].differential_on === 'shift'
                        )
                        .map((filteredRate) => ({
                            ...filteredRate
                        }))
                }));

                return {
                    base_rate: {
                        rate_type: {
                            ...baseRate.rate_type?.get(),
                            shift_type: shiftType,
                            rate_type_category: rateTypeCategory,
                            min_rate: matchingDecisionRecord.min_rate,
                            max_rate: matchingDecisionRecord.max_rate,
                        },
                        rates: filteredRateType,
                    },
                    rate: filteredRate
                };
            }));

            return {
                name: rateConfiguration.name,
                is_shift_rate: rateConfiguration.is_shift_rate,
                hierarchies: uniqueHierarchies,
                rate_configuration: rateConfigurationDetails,
            };
        }));

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Rate configurations fetched successfully.',
            rate_configurations: responses,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}

export async function getAllHierarchiesAndJobTemplates(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string };
    const traceId = generateCustomUUID();

    try {
        const results = await sequelize.query(rateConfigHierarchiesAndJobTemplates, {
            replacements: { program_id },
            type: QueryTypes.SELECT,
        });

        const jobTemplates = [
            ...new Map(
                results
                    .filter((result: any) => result.job_template_id && result.job_template_name)
                    .map((result: any) => [result.job_template_id, { id: result.job_template_id, name: result.job_template_name }])
            ).values()
        ];

        const hierarchies = [
            ...new Map(
                results
                    .filter((result: any) => result.hierarchy_id && result.hierarchy_name)
                    .map((result: any) => [result.hierarchy_id, { id: result.hierarchy_id, name: result.hierarchy_name }])
            ).values()
        ];

        const rateType = [
            ...new Map(
                results
                    .filter((result: any) => result.rate_id && result.rate_name)
                    .map((result: any) => [result.rate_id, { id: result.rate_id, name: result.rate_name }])
            ).values()
        ];

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            data: {
                hierarchies: hierarchies,
                job_templates: jobTemplates,
                rate_type: rateType,
            },
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Failed to retrieve hierarchies and job template data',
            error: error.message,
        });
    }
}

function calculateRates(rates: any[], baseRateMin: number, baseRateMax: number, ot_exempt: boolean, rateTypeCategory: string) {
    return rates.map((rate) => {
        const differential_value = ot_exempt && rateTypeCategory === "overtime" ? 1 : rate.differential_value;

        return {
            ...rate,
            differential_value,
            min_rate: rate.differential_type === "Factor Differential"
                ? baseRateMin * differential_value
                : baseRateMin + differential_value,
            max_rate: rate.differential_type === "Factor Differential"
                ? baseRateMax * differential_value
                : baseRateMax + differential_value,
        };
    });
}

export async function getAllRateConfigurationBudget(request: FastifyRequest<{ Body: any[] }>, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const response = request.body.map((config) => {
            const { program_id, name, is_shift_rate, hierarchies, job_templates, rate_configuration, ot_exempt } = config;

            const rateConfigurationDetails = rate_configuration.map((rateConfig: { base_rate: { rate_type: { min_rate: any; max_rate: any }; rates: any[] }; rate: any[] }) => {
                const baseRateMin = Number(rateConfig.base_rate.rate_type.min_rate.amount);
                const baseRateMax = Number(rateConfig.base_rate.rate_type.max_rate.amount);

                const base_rate = {
                    ...rateConfig.base_rate,
                    rates: rateConfig.base_rate.rates.map((rate) => {
                        const rateTypeCategory = rate.rate_type.rate_type_category.value;
                        return {
                            ...rate,
                            rateTypeCategory,
                            bill_rate: calculateRates(rate.bill_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                            pay_rate: calculateRates(rate.pay_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                        };
                    }),
                };

                const rates = rateConfig.rate?.map((rateConfigNested) => {
                    const rateTypeCategory = rateConfigNested.rate_type.rate_type_category.value;
                    return {
                        ...rateConfigNested,
                        rateTypeCategory,
                        bill_rate: calculateRates(rateConfigNested.bill_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                        pay_rate: calculateRates(rateConfigNested.pay_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                        rates: rateConfigNested.rates.map((nestedRate: { rate_type: any; bill_rate: any[]; pay_rate: any[] }) => {
                            const nestedRateTypeCategory = nestedRate.rate_type.rate_type_category.value;
                            return {
                                ...nestedRate,
                                rateTypeCategory: nestedRateTypeCategory,
                                bill_rate: calculateRates(nestedRate.bill_rate, baseRateMin, baseRateMax, ot_exempt, nestedRateTypeCategory),
                                pay_rate: calculateRates(nestedRate.pay_rate, baseRateMin, baseRateMax, ot_exempt, nestedRateTypeCategory),
                            };
                        }),
                    };
                });
                return { base_rate, rate: rates };
            });
            return { program_id, name, is_shift_rate, hierarchies, job_templates, rate_configuration: rateConfigurationDetails };
        });

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: "Rate configurations fetched successfully.",
            rate_configurations: response,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message,
        });
    }
}
