import { FastifyRequest, FastifyReply } from "fastify";
import RateCard from "../models/rate-card.model";
import DecisionTable from "../models/rate-card-decision.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from '../config/instance';
import hierarchies from "../models/hierarchies.model";
import jobTemplateModel from "../models/jobTemplateModel";
import { rateType } from "../models/rate-type.model";
import Currencies from "../models/currencies.model";
import IndustriesModel from "../models/industries.model";

export const createRateCard = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    try {
        const { program_id } = request.params as { program_id: string };
        const { decision_table, ...rateCardData } = request.body as any;
        const newRateCard = await RateCard.create(
            {
                ...rateCardData,
                program_id,
            },
            { transaction }
        );
        if (decision_table && Array.isArray(decision_table)) {
            for (const entry of decision_table) {
                await DecisionTable.create(
                    {
                        ...entry,
                        rate_card_id: newRateCard.id,
                    },
                    { transaction }
                );
            }
        }
        await transaction.commit();
        reply.status(201).send({
            status_code: 201,
            message: "Rate card created successfully.",
            rate_card_id: newRateCard.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message || error,
            trace_id: traceId,
        });
    }
};
export const getAllRateCards = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, modified_on, is_enabled, labor_category_name } = request.query as {
            page?: number;
            limit?: number;
            modified_on?: string;
            is_enabled?: boolean;
            labor_category_name?: string;
        };

        const parsedLimit = parseInt(limit as any, 10) || 10;
        const parsedPage = parseInt(page as any, 10) || 1;
        const offset = (parsedPage - 1) * parsedLimit;
        const whereConditions: any = {
            program_id,
            is_deleted: false,
        };
        if (modified_on) {
            whereConditions.modified_on = modified_on;
        }
        if (is_enabled !== undefined) {
            whereConditions.is_enabled = is_enabled ? 1 : 0;
        }
        let laborCategoryIds: string[] = [];
        if (labor_category_name) {
            const laborCategories = await IndustriesModel.findAll({
                where: { name: labor_category_name },
                attributes: ['id'],
            });
            laborCategoryIds = laborCategories.map((category) => category.id);
            if (laborCategoryIds.length === 0) {
                return reply.status(200).send({
                    status_code: 200,
                    total_records: 0,
                    total_pages: 0,
                    current_page: parsedPage,
                    items_per_page: parsedLimit,
                    rate_cards: [],
                    trace_id: traceId,
                });
            }
            whereConditions.labor_category_id = laborCategoryIds;
        }
        const totalRecords = await RateCard.count({
            where: whereConditions,
        });
        const totalPages = Math.ceil(totalRecords / parsedLimit);
        const rateCards = await RateCard.findAll({
            where: whereConditions,
            limit: parsedLimit,
            offset,
        });

        if (!rateCards.length) {
            return reply.status(200).send({
                status_code: 200,
                total_records: totalRecords,
                total_pages: totalPages,
                current_page: parsedPage,
                items_per_page: parsedLimit,
                rate_cards: [],
                trace_id: traceId,
            });
        }

        const laborCategoryIdsFromRateCards = rateCards
            .map((rateCard) => rateCard.labor_category_id)
            .filter((id) => id !== null);

        const laborCategories = await IndustriesModel.findAll({
            where: { id: laborCategoryIdsFromRateCards },
            attributes: ['id', 'name'],
        });

        const laborCategoryMap = laborCategories.reduce((map, category) => {
            map[category.id] = category;
            return map;
        }, {} as Record<string, any>);

        const rateCardIds = rateCards.map((rateCard) => rateCard.id);
        const decisionTables = await DecisionTable.findAll({
            where: { rate_card_id: rateCardIds },
            include: [
                {
                    model: hierarchies,
                    as: 'hierarchy',
                    attributes: ['id', 'name'],
                },
                {
                    model: jobTemplateModel,
                    as: 'job_template',
                    attributes: ['id', 'template_name'],
                },
                {
                    model: rateType,
                    as: 'rate_type',
                    attributes: ['id', 'name'],
                },
                {
                    model: Currencies,
                    as: 'currency',
                    attributes: ['id', 'name'],
                },
            ],
        });

        const rateCardsWithDetails = rateCards.map((rateCard) => {
            const laborCategory = laborCategoryMap[rateCard.labor_category_id] || null;
            const relatedDecisionTables = decisionTables.filter(
                (decisionTable) => decisionTable.rate_card_id === rateCard.id
            );
            return {
                ...rateCard.toJSON(),
                labor_category: laborCategory,
                decision_table: relatedDecisionTables.map((dt) => ({
                    id: dt.id,
                    rate_card_id: dt.rate_card_id,
                    hierarchy: dt.hierarchy,
                    job_template: dt.job_template,
                    rate_type: dt.rate_type,
                    currency: dt.currency,
                    unit_of_measure: dt.unit_of_measure,
                    min_rate: dt.min_rate,
                    max_rate: dt.max_rate,
                    created_on: dt.created_on,
                    modified_on: dt.modified_on,
                })),
            };
        });

        reply.status(200).send({
            status_code: 200,
            total_records: totalRecords,
            total_pages: totalPages,
            current_page: parsedPage,
            items_per_page: parsedLimit,
            rate_cards: rateCardsWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message || error,
            trace_id: traceId,
        });
    }
};


export const getRateCardById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const rateCard = await RateCard.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!rateCard) {
            return reply.status(200).send({
                status_code: 200,
                message: "Rate card not found.",
                trace_id: traceId,
            });
        }
        let laborCategory = null;
        if (rateCard.labor_category_id) {
            laborCategory = await IndustriesModel.findOne({
                where: { id: rateCard.labor_category_id },
                attributes: ["id", "name"],
            });
        }

        const decisionTables = await DecisionTable.findAll({
            where: { rate_card_id: rateCard.id },
            include: [
                {
                    model: hierarchies,
                    as: "hierarchy",
                    attributes: ["id", "name"],
                },
                {
                    model: jobTemplateModel,
                    as: "job_template",
                    attributes: ["id", "template_name"],
                },
                {
                    model: rateType,
                    as: "rate_type",
                    attributes: ["id", "name"],
                },
                {
                    model: Currencies,
                    as: "currency",
                    attributes: ["id", "name"],
                },
            ],
        });

        const rateCardWithDetails = {
            ...rateCard.toJSON(),
            labor_category: laborCategory,
            decision_table: decisionTables.map((dt) => ({
                id: dt.id,
                rate_card_id: dt.rate_card_id,
                hierarchy: dt.hierarchy,
                job_template: dt.job_template,
                rate_type: dt.rate_type,
                currency: dt.currency,
                unit_of_measure: dt.unit_of_measure,
                min_rate: dt.min_rate,
                max_rate: dt.max_rate,
                created_on: dt.created_on,
                modified_on: dt.modified_on,
            })),
        };
        reply.status(200).send({
            status_code: 200,
            rate_card: rateCardWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: "Internal Server Error",
            error: error.message || error,
            trace_id: traceId,
        });
    }
};



export const updateRateCard = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const { decision_table, ...rateCardUpdates } = request.body as any;
        const rateCard = await RateCard.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!rateCard) {
            await transaction.rollback();
            return reply.status(200).send({
                status_code: 200,
                message: "Rate card not found.",
                trace_id: traceId,
            });
        }
        await RateCard.update(rateCardUpdates, {
            where: { id, program_id, is_deleted: false },
            transaction,
        });
        if (decision_table && Array.isArray(decision_table)) {
            await DecisionTable.destroy({
                where: { rate_card_id: id },
                transaction,
            });
            for (const entry of decision_table) {
                await DecisionTable.create(
                    {
                        ...entry,
                        rate_card_id: id,
                    },
                    { transaction }
                );
            }
        }
        await transaction.commit();
        reply.status(200).send({
            status_code: 200,
            message: "Rate card updated successfully.",
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message || error,
            trace_id: traceId,
        });
    }
};

export const deleteRateCard = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const rateCard = await RateCard.findOne({
            where: { id, program_id, is_deleted: false },
            transaction,
        });
        if (!rateCard) {
            await transaction.rollback();
            return reply.status(200).send({
                status_code: 200,
                message: "Rate card not found.",
                trace_id: traceId,
            });
        }
        await rateCard.update({ is_deleted: true }, { transaction });
        await DecisionTable.update(
            { is_deleted: true },
            { where: { rate_card_id: id }, transaction }
        );
        await transaction.commit();
        reply.status(200).send({
            status_code: 200,
            message: "Rate card deleted successfully.",
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message || error,
            trace_id: traceId,
        });
    }
};
