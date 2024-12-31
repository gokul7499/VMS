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
import jobTemplateModel from '../models/jobTemplateModel';
import rateType from '../models/rate-type.model';
import hierarchies from '../models/hierarchies.model';
import picklistItemModel from '../models/picklistItemModel';
import { getAllRateConfigurationsQuery } from '../utility/queries';

export const createRateConfigurations = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const rateConfigurationsPayload = request.body as Partial<RateConfigurationsInterface>;
    const transaction = await sequelize.transaction();

    try {
        const rateData = await RateConfigurationsModel.create({
            program_id,
            name: rateConfigurationsPayload.name,
            is_shift_rate: rateConfigurationsPayload.is_shift_rate,
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

                        if (rate.bill_rate) {
                            await RateConfigurationRateDifferentials.create({
                                rate_id: rateTypeRecord.id,
                                differential_on: rate.bill_rate.differential_on,
                                differential_type: rate.bill_rate.differential_type,
                                differential_value: rate.bill_rate.differential_value,
                                type: 'BILL_RATE',
                            }, { transaction });
                        }

                        if (rate.pay_rate) {
                            await RateConfigurationRateDifferentials.create({
                                rate_id: rateTypeRecord.id,
                                differential_on: rate.pay_rate.differential_on,
                                differential_type: rate.pay_rate.differential_type,
                                differential_value: rate.pay_rate.differential_value,
                                type: 'PAY_RATE',
                            }, { transaction });
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

    try {
        const existingRateConfig = await RateConfigurationsModel.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!existingRateConfig) {
            return reply.status(404).send({
                message: 'Rate configurations not found.',
                trace_id: traceId,
            });
        }

        await existingRateConfig.update(
            {
                name: rateConfigurationsPayload.name,
                is_shift_rate: rateConfigurationsPayload.is_shift_rate,
                modified_on: Date.now()
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

                        if (rateItem.bill_rate) {
                            await RateConfigurationRateDifferentials.destroy({
                                where: { rate_id: rateTypeRecord?.id, type: 'BILL_RATE' },
                                transaction,
                            });
                            await RateConfigurationRateDifferentials.upsert(
                                {
                                    id: rateItem.bill_rate.id,
                                    rate_id: rateTypeRecord.id,
                                    differential_on: rateItem.bill_rate.differential_on,
                                    differential_type: rateItem.bill_rate.differential_type,
                                    differential_value: rateItem.bill_rate.differential_value,
                                    type: 'BILL_RATE',
                                },
                                { transaction }
                            );
                        }

                        if (rateItem.pay_rate) {
                            await RateConfigurationRateDifferentials.destroy({
                                where: { rate_id: rateTypeRecord?.id, type: 'PAY_RATE' },
                                transaction,
                            });
                            await RateConfigurationRateDifferentials.upsert(
                                {
                                    id: rateItem.pay_rate.id,
                                    rate_id: rateTypeRecord.id,
                                    differential_on: rateItem.pay_rate.differential_on,
                                    differential_type: rateItem.pay_rate.differential_type,
                                    differential_value: rateItem.pay_rate.differential_value,
                                    type: 'PAY_RATE',
                                },
                                { transaction }
                            );
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
    request: FastifyRequest<{ Params: { program_id: string }; Querystring: { name?: string; is_enabled?: string; is_shift_rate?: string; modified_on?: string; page?: string; limit?: string } }>,
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
            is_enabled: isEnabled,
            is_shift_rate: isShiftRate,
            startDate,
            endDate,
            limit,
            offset,
        };

        const rateConfigurationsWithDetails = await getAllRateConfigurationsQuery(replacements);

        if (!rateConfigurationsWithDetails.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Rate configurations not found.",
                trace_id: traceId,
                rate_configurations: [],
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: "Rate configurations fetched successfully.",
            trace_id: traceId,
            items_per_page: limit,
            total_records: rateConfigurationsWithDetails.length,
            rate_configurations: rateConfigurationsWithDetails,
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
            attributes: ['id', 'program_id', 'name', 'is_shift_rate'],
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
                            attributes: ['differential_on', 'differential_type', 'differential_value', 'type'],
                        });

                        const payRates = await RateConfigurationRateDifferentials.findAll({
                            where: { rate_id: rate.id, type: 'PAY_RATE' },
                            attributes: ['differential_on', 'differential_type', 'differential_value', 'type'],
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
            is_shift_rate: rateConfiguration.is_shift_rate,
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

export async function getAllRateConfigurationRates(
    request: FastifyRequest<{
        Params: { program_id: string };
        Querystring: {
            hierarchie_id?: string;
            job_templates?: string;
            is_shift_rate?: boolean;
        };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { hierarchie_id, job_templates, is_shift_rate } = request.query;

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

        const rateConfigurationIdsFromHierarchies = hierarchyRecords.map(
            (record) => record.rate_configuration_id
        );
        const rateConfigurationIdsFromJobTemplates = jobTemplateRecords.map(
            (record) => record.rate_configuration_id
        );
        const finalRateConfigurationIds = rateConfigurationIdsFromHierarchies.filter((id) =>
            rateConfigurationIdsFromJobTemplates.includes(id)
        );

        const rateConfiguration = await RateConfigurationsModel.findOne({
            where: { program_id, id: finalRateConfigurationIds, is_shift_rate },
            attributes: ['id', 'program_id', 'name', 'is_shift_rate'],
        });

        if (!rateConfiguration) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'Rate configuration not found.',
                rate_configurations: [],
            });
        }

        const hierarchie = await RateConfigurationHierarchies.findAll({
            where: { rate_configuration_id: finalRateConfigurationIds },
            include: [{ model: hierarchies, as: 'hierarchy', attributes: ['id', 'name'] }],
        });

        const uniqueHierarchies = Array.from(
            new Set(hierarchie.map((item) => JSON.stringify({ id: item.hierarchy.id, name: item.hierarchy.name })))
        ).map((item) => JSON.parse(item));

        const jobTemplates = await RateConfigurationJobTemplates.findAll({
            where: { rate_configuration_id: finalRateConfigurationIds },
            include: [{ model: jobTemplateModel, as: 'job_template', attributes: ['id', 'template_name'] }],
        });

        const uniqueJobTemplates = Array.from(
            new Set(jobTemplates.map((item) => JSON.stringify({ id: item.job_template?.id, name: item.job_template?.template_name })))
        ).map((item) => JSON.parse(item));

        const baseRates = await RateConfigurationBaseRateTypes.findAll({
            where: { rate_configuration_id: finalRateConfigurationIds },
            include: [{
                model: rateType,
                as: 'rate_type',
                where: { is_base_rate: true },
                attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type']
            }],
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
                    include: [{
                        model: rateType,
                        as: 'rate_type',
                        where: { is_base_rate: false },
                        attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type']
                    }],
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
                            attributes: ['differential_on', 'differential_type', 'differential_value'],
                        });

                        const payRates = await RateConfigurationRateDifferentials.findAll({
                            where: { rate_id: rate.id, type: 'PAY_RATE' },
                            attributes: ['differential_on', 'differential_type', 'differential_value'],
                        });

                        return {
                            rate_type: {
                                ...rate.rate_type?.get(),
                                rate_type_category: rateTypeCategory,
                            },
                            bill_rate: billRates,
                            pay_rate: payRates,
                        };
                    })
                );
                const filteredRateType = rateDetails.filter((rate) =>
                    rate.rate_type?.rate_type_category?.value != 'shift' &&
                    rate.bill_rate.some((billRate) => billRate.differential_on === rateTypeCategory?.value)
                );
                const filteredRate = rateDetails.filter((rate) =>
                    rate.rate_type?.is_base_rate === false &&
                    rate.rate_type?.rate_type_category?.value === 'shift'
                ).map((rate) => ({
                    ...rate,
                    rates: filteredRateType
                        .filter((filteredRate) =>
                            filteredRate.rate_type?.rate_type_category?.value !== 'shift' &&
                            filteredRate.bill_rate.some((billRate) =>
                                billRate.differential_on === rateTypeCategory?.value
                            )
                        )
                        .map((filteredRate) => ({
                            ...filteredRate
                        }))
                }));

                return {
                    base_rate: {
                        rate_type: {
                            ...baseRate.rate_type?.get(),
                            rate_type_category: rateTypeCategory,
                        },
                        rates: filteredRateType,
                    },
                    rate: filteredRate,
                };
            })
        );

        const response = {
            program_id: rateConfiguration.program_id,
            name: rateConfiguration.name,
            is_shift_rate: rateConfiguration.is_shift_rate,
            hierarchies: uniqueHierarchies,
            job_templates: uniqueJobTemplates,
            rate_configuration: rateConfigurationDetails,
        };

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Rate configurations fetched successfully.',
            rate_configurations: [response],
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