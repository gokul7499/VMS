import { FastifyRequest, FastifyReply } from "fastify";
import timesheetConfigRuleModel from "../models/timesheetruleconfigModel";
import { TimesheetRuleData } from "../interfaces/timesheetruleconfignterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { handleError } from "../utility/errorHandler";
import { sequelize } from "../config/instance";
import { Op, Sequelize } from "sequelize";
import TimeSheetConfigRuleModel from "../models/timesheetruleconfigModel";
import hierarchies from "../models/hierarchiesModel";
import TimeSheetConfigModel from "../models/timeSheetConfigModel";
import workLocationModel from "../models/workLocationModel";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const createTimeSheetConfigRule = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const timesheetConfigRule = request.body as TimesheetRuleData;
    const { program_id } = request.params as { program_id: string };
    const trace_id = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }

    logger(
        {
            trace_id,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating timesheet config rule",
            status: "success",
            description: `Creating timesheet config rule for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        timesheetConfigRuleModel
    );

    try {
        const existingRule = await timesheetConfigRuleModel.findOne({
            where: {
                title: timesheetConfigRule.title,
                program_id
            }
        });

        if (existingRule) {
            return reply.status(409).send({
                message: `Timesheet Config Rule with name'${timesheetConfigRule.title}' already exists for this program.`
            });
        }

        const transaction = await sequelize.transaction();
        try {
            const newItem = await timesheetConfigRuleModel.create(
                { ...timesheetConfigRule, program_id },
                { transaction }
            );

            await setAssociations(newItem, timesheetConfigRule, transaction);

            await transaction.commit();

            logger(
                {
                    trace_id,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "created timesheet config rule",
                    status: "success",
                    description: `Created timesheet config rule for ${program_id} successfully: ${newItem.id}`,
                    level: 'success',
                    action: request.method,
                    url: request.url,
                    entity_id: program_id,
                    is_deleted: false
                },
                timesheetConfigRuleModel
            );

            reply.status(201).send({
                status_code: 201,
                timesheet_config_rule: newItem.id,
                trace_id: generateCustomUUID(),
            });
        } catch (error: any) {
            logger(
                {
                    trace_id,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "created timesheet config rule",
                    status: "error",
                    description: `Error creating timesheet config rule for ${program_id}`,
                    level: 'error',
                    action: request.method,
                    url: request.url,
                    entity_id: program_id,
                    is_deleted: false
                },
                timesheetConfigRuleModel
            );

            await transaction.rollback();
            handleError(error, reply);
        }
    } catch (error: any) {
        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating timesheet config rule",
                status: "error",
                description: `Error creating timesheet config rule for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            timesheetConfigRuleModel
        );

        reply.status(500).send({
            message: 'An error occurred while creating',
            error: (error as any).message
        });
    }
};


export const getTimeSheetConfigRuleById = async (
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { id, program_id } = request.params;
        const timesheetConfigRule = await timesheetConfigRuleModel.findOne({
            where: { id, program_id, is_deleted: false },
            attributes: [
                "id",
                "program_id",
                "title",
                "modified_on",
                "status",
                "modified_by",
                "is_deleted",
                "rules_config",
                "is_enabled"
            ],
            include: [
                {
                    model: hierarchies,
                    as: "hierarchies",
                    attributes: ["id", "name"],
                    through: { attributes: [] },
                },
                {
                    model: TimeSheetConfigModel,
                    as: "timesheetConfig",
                    attributes: ["id", "title",],
                    through: { attributes: [] },
                    include: [
                        {
                            model: hierarchies,
                            as: "hierarchies",
                            attributes: ["id", "name"],
                            through: { attributes: [] },
                        },
                        {
                            model: workLocationModel,
                            as: "workLocations",
                            attributes: ["id", "name"],
                            through: { attributes: [] },
                        },
                    ],
                },
            ],
        });

        if (timesheetConfigRule) {
            reply.status(201).send({
                status_code: 201,
                message: "TimeSheet configuration Rule retrieved successfully",
                timesheet_config_rule: timesheetConfigRule,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "TimeSheet configuration Rule data not found",
                timesheet_config_rule: [],
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        handleError(error, reply);
    }
};

export const updateTimeSheetConfigRuleById = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const updates = request.body as Partial<TimesheetRuleData>;
    try {
        const [timesheet_config_rule] = await timesheetConfigRuleModel.update(updates, {
            where: { id, program_id }
        });

        if (timesheet_config_rule === 0) {
            return reply.status(200).send({
                message: "TimeSheet configuration Rule data not found",
                trace_id: generateCustomUUID(),
                timesheet_config_rule: [],
            });
        }

        reply.status(201).send({
            status_code: 201,
            message: "TimeSheet configuration Rule updated successfully",
            timesheet_config_rule: id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        handleError(error, reply);
    }
};

export const deleteTimeSheetRuleById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const [numRowsDeleted] = await timesheetConfigRuleModel.update({
            is_deleted: true,
            is_enabled: false,
            modified_on: Date.now(),
        }, {
            where: { id }
        });

        if (numRowsDeleted > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "TimeSheet config deleted successfully",
                timesheet_config_rule: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                message: "TimeSheet configuration Rule not found",
                timesheet_config_rule: [],
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        handleError(error, reply);
    }
};
export const getAllTimeSheetConfigByProgramId = async (
    request: FastifyRequest<{
        Params: { program_id: string };
        Querystring: {
            page?: number;
            pageSize?: number;
            "info-level"?: string;
            title?: string;
            is_active?: boolean;
            hierarchy_ids?: string[];
            timesheet_config_id?: string[];
        };
    }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;
    const {
        page = 1,
        pageSize = 10,
        "info-level": infoLevel,
        title,
        is_active,
        hierarchy_ids,
        timesheet_config_id,
    } = request.query;

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    try {
        const attributes =
            infoLevel === "detail"
                ? undefined
                : [
                    "id",
                    "program_id",
                    "title",
                    "modified_on",
                    "status",
                    "modified_by",
                    "is_deleted",
                    "rules_config",
                    "is_enabled"
                ];

        const whereClause: any = { program_id };

        if (title) {
            whereClause.title = { [Op.iLike]: `%${title}%` };
        }
        if (typeof is_active !== "undefined") {
            whereClause.is_active = is_active;
        }
        if (hierarchy_ids) {
            whereClause.hierarchy_ids = { [Op.contains]: hierarchy_ids };
        }
        if (timesheet_config_id) {
            whereClause.timesheet_config_id = { [Op.contains]: timesheet_config_id };
        }

        const { count, rows } = await TimeSheetConfigRuleModel.findAndCountAll({
            where: whereClause,
            attributes,
            limit,
            offset,
            distinct: true,
            include: [
                {
                    model: hierarchies,
                    as: "hierarchies",
                    attributes: ["id", "name"],
                    through: { attributes: [] },
                },
                {
                    model: TimeSheetConfigModel,
                    as: "timesheetConfig",
                    attributes: ["id", "title"],
                    through: { attributes: [] },
                    include: [
                        {
                            model: hierarchies,
                            as: "hierarchies",
                            attributes: ["id", "name"],
                            through: { attributes: [] },
                        },
                        {
                            model: workLocationModel,
                            as: "workLocations",
                            attributes: ["id", "name"],
                            through: { attributes: [] },
                        },
                    ],
                },
            ],
        });

        // Debugging output
        console.log(`Offset: ${offset}, Limit: ${limit}, Count: ${count}`);

        const sanitizedData = rows.map((item: any) => {
            const itemJSON = item.toJSON();
            return itemJSON;
        });

        const totalPages = Math.ceil(count / pageSize);
        const currentPage = page;

        const response = {
            status_code: 200,
            message:
                sanitizedData.length > 0
                    ? "TimeSheet configuration data retrieved successfully"
                    : "TimeSheet configuration data not found for the given program",
            time_sheet_config_data: sanitizedData,
            pagination: {
                total_count: count,
                total_pages: totalPages,
                current_page: currentPage,
                page_size: pageSize,
            },
        };

        reply.status(200).send(response);
    } catch (error) {
        handleError(error, reply);
    }
};

export const getAllTimeSheetConfig = async (
    request: FastifyRequest<{
        Params: { program_id: string };
    }>,
    reply: FastifyReply
) => {
    const { program_id } = request.params;

    try {
        const whereClause: any = { program_id };

        const { count, rows } = await TimeSheetConfigRuleModel.findAndCountAll({
            where: whereClause,

            distinct: true,
            include: [
                {
                    model: hierarchies,
                    as: "hierarchies",
                    attributes: ["id", "name"],
                    through: { attributes: [] },
                },
                {
                    model: TimeSheetConfigModel,
                    as: "timesheetConfig",
                    attributes: ["id", "title"],
                    through: { attributes: [] },
                },
            ],
        });

        const titles: string[] = [];
        const hierarchiesList: any[] = [];
        const rulesConfigList: any[] = [];
        const timesheetConfigList: any[] = [];

        rows.forEach((item: any) => {
            const itemJSON = item.toJSON();

            if (itemJSON.title) titles.push(itemJSON.title);

            if (itemJSON.hierarchies) {
                itemJSON.hierarchies.forEach((hierarchy: any) => {
                    hierarchiesList.push({
                        id: hierarchy.id,
                        name: hierarchy.name,
                    });
                });
            }

            if (itemJSON.rules_config) {
                itemJSON.rules_config.forEach((ruleConfig: any) => {
                    rulesConfigList.push({
                        id: ruleConfig.id,
                        name: ruleConfig.name,
                        type: ruleConfig.type,
                    });
                });
            }

            if (itemJSON.timesheetConfig) {
                itemJSON.timesheetConfig.forEach((timesheetConfig: any) => {
                    timesheetConfigList.push({
                        id: timesheetConfig.id,
                        title: timesheetConfig.title,
                    });
                });
            }
        });


        const response = {
            status_code: 200,
            message:
                rows.length > 0
                    ? "TimeSheet configuration data retrieved successfully"
                    : "TimeSheet configuration data not found for the given program",
            time_sheet_config_data: {
                titles,
                hierarchiesList,
                rulesConfigList,
                timesheetConfigList,
            },
            pagination: {
                total_count: count,
            },
        };

        reply.status(200).send(response);
    } catch (error) {
        handleError(error, reply);
    }
};

const setAssociations = async (newItem: any, timesheetConfigRule: TimesheetRuleData, transaction: any) => {
    if (timesheetConfigRule.hierarchy_ids) {
        await newItem.setHierarchies(timesheetConfigRule.hierarchy_ids, { transaction });
    }

    if (timesheetConfigRule.timesheet_config_id) {
        await newItem.setTimesheetConfig(timesheetConfigRule.timesheet_config_id, { transaction });
    }

};

export async function timeSheetConfigAdvancedFilter(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { filters = {}, pagination } = request.body as {
            filters?: Record<string, any>;
            pagination?: { page?: number; limit?: number };
        };

        const include = [
            {
                model: hierarchies,
                as: 'hierarchies',
                attributes: ['id', 'name', 'is_enabled'],
                through: { attributes: [] }
            },
            {
                model: TimeSheetConfigModel,
                as: "timesheetConfig",
                attributes: ["id", "title", "hierarchy_ids"],
                through: { attributes: [] },
            },

        ];

        const timeSheetConfigData = await advancedFilter(request, include);

        const totalRecords = timeSheetConfigData.count;
        const currentPageResult = timeSheetConfigData.rows.length;
        const perPage = pagination?.limit ?? 10;
        const currentPage = pagination?.page ?? 1;
        const lastPage = Math.ceil(totalRecords / perPage);

        const sanitizedData = timeSheetConfigData.rows.map((item: any) => {
            const { hierarchy_ids, work_location_ids, timesheet_config_id, ...rest } = item.toJSON();
            return rest;
        });

        reply.status(200).send({
            status_code: 200,
            message: sanitizedData.length > 0
                ? "TimeSheet configuration data retrieved successfully"
                : "TimeSheet configuration data not found for the given program",
            time_sheet_config_data: sanitizedData,
            pagination: {
                total_records: totalRecords,
                current_page_result: currentPageResult,
                per_page: perPage,
                current_page: currentPage,
                last_page: lastPage,
            },
        });
    } catch (error) {
        handleError(error, reply);
    }
}

async function advancedFilter(request: FastifyRequest, include?: any[]) {
    const { filters = {}, pagination } = request.body as {
        filters?: Record<string, any>;
        pagination?: { page?: number; limit?: number };
    };

    const whereCondition: { [key: string]: any } = { is_deleted: false };

    Object.keys(filters).forEach((field) => {
        const value = filters[field];

        if (field === 'hierarchy_ids') {
            if (Array.isArray(value)) {
                whereCondition[field] = {
                    [Op.or]: value.map(id => Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col(`TimeSheetConfigRuleModel.${field}`), JSON.stringify(id)),
                        true
                    ))
                };
            } else if (typeof value === 'string') {
                const ids = value.split(',');
                whereCondition[field] = {
                    [Op.or]: ids.map(id => Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col(`TimeSheetConfigRuleModel.${field}`), JSON.stringify(id.trim())),
                        true
                    ))
                };
            }
        } else if (Array.isArray(value)) {
            if (field === 'name') {
                whereCondition['rules_config'] = {
                    [Op.or]: value.map(name => Sequelize.where(
                        Sequelize.fn('JSON_SEARCH', Sequelize.col('rules_config'), 'one', `%${name}%`),
                        {
                            [Op.not]: null
                        }
                    ))
                };
            } else if (value.length === 2 && !isNaN(Date.parse(value[0])) && !isNaN(Date.parse(value[1]))) {
                whereCondition[field] = {
                    [Op.between]: [new Date(value[0]), new Date(value[1])]
                };
            } else if (value.length > 0 && value.every(v => typeof v === 'string')) {
                whereCondition[field] = {
                    [Op.or]: value.map(val => ({
                        [Op.like]: `%${val}%`
                    }))
                };
            } else if (value.length > 0) {
                whereCondition[field] = Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col(field), JSON.stringify(value)),
                    true
                );
            }
        } else if (typeof value === "boolean") {
            whereCondition[field] = value;
        } else if (typeof value === "string") {
            whereCondition[field] = {
                [Op.like]: `%${value}%`
            };
        } else if (typeof value === "number") {
            whereCondition[field] = value;
        } else if (value instanceof Date || !isNaN(Date.parse(value))) {
            whereCondition[field] = {
                [Op.eq]: new Date(value)
            };
        }
    });

    const offset = pagination?.page ? (pagination.page - 1) * (pagination.limit ?? 10) : undefined;
    const limit = pagination?.limit ?? undefined;

    const options: any = {
        where: whereCondition,
        distinct: true,
        order: [["created_on", "DESC"]],
        include: include
    };

    if (offset !== undefined && limit !== undefined) {
        options.offset = offset;
        options.limit = limit;
    }

    const results = await timesheetConfigRuleModel.findAndCountAll(options);
    return results;
}