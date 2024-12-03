import { FastifyRequest, FastifyReply } from "fastify";
import timeSheetConfigModel from "../models/timeSheetConfigModel";
import hierarchyModel from "../models/hierarchiesModel";
import workLocationModel from "../models/workLocationModel";
import FoundationalDataTypes from "../models/foundationalDatatypesModel";
import { timeSheetConfigInterface } from "../interfaces/timeSheetConfigInterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { handleError } from "../utility/errorHandler";
import { sequelize } from "../config/instance";
import { Op, Sequelize } from "sequelize";
import hierarchies from "../models/hierarchiesModel";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import countyModel from "../models/countyModel";
import stateModel from "../models/stateModel";
import cityModel from "../models/cityModel";
import CountryModel from "../models/countriesModel";


export const createTimeSheetConfig = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id } = request.params as { program_id: string };
    const timeSheetConfig = request.body as timeSheetConfigInterface;
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
            eventname: "creating time sheet config",
            status: "success",
            description: `Creating time sheet config for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        timeSheetConfigModel
    );

    try {
        const existingConfig = await timeSheetConfigModel.findOne({
            where: {
                title: timeSheetConfig.title,
                program_id
            }
        });

        if (existingConfig) {
            return reply.status(409).send({
                message: `TimeSheetConfig with name '${timeSheetConfig.title}' already exists for this program.`
            });
        }

        const transaction = await sequelize.transaction();
        try {
            const newItem = await timeSheetConfigModel.create(
                { ...timeSheetConfig, program_id },
                { transaction }
            );
            await setAssociations(newItem, timeSheetConfig, transaction);
            await transaction.commit();

            logger(
                {
                    trace_id,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "created time sheet config",
                    status: "success",
                    description: `Created time sheet config for ${program_id} successfully: ${newItem.id}`,
                    level: 'success',
                    action: request.method,
                    url: request.url,
                    entity_id: program_id,
                    is_deleted: false
                },
                timeSheetConfigModel
            );

            reply.status(201).send({
                status_code: 201,
                rule: newItem.id,
                trace_id,
            });
        } catch (error: any) {
            await transaction.rollback();
            logger(
                {
                    trace_id,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "created time sheet config",
                    status: "error",
                    description: `Error creating time sheet config for ${program_id}`,
                    level: 'error',
                    action: request.method,
                    url: request.url,
                    entity_id: program_id,
                    is_deleted: false
                },
                timeSheetConfigModel
            );

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
                eventname: "creating time sheet config",
                status: "error",
                description: `Error creating time sheet config for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            timeSheetConfigModel
        );

        handleError(error, reply);
    }
};


export const getTimeSheetConfigById = async (
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { id, program_id } = request.params;
        const timeSheetConfig = await timeSheetConfigModel.findOne({
            where: { id, program_id, is_deleted: false },
            attributes: { exclude: ["ref_id"] },
            include: [
                {
                    model: workLocationModel,
                    as: 'workLocations',
                    attributes: ['id', 'name'],
                    through: { attributes: [] },
                },
                {
                    model: hierarchies,
                    as: 'hierarchies',
                    attributes: ['id', 'name', 'is_enabled'],
                    through: { attributes: [] }
                },
            ]
        });

        if (timeSheetConfig) {
            const populatedWorkLocationIds = timeSheetConfig.workLocations.map(
                (location: { id: any; name: any; }) => ({
                    id: location.id,
                    name: location.name,
                })
            );

            const populatedHierarchyIds = timeSheetConfig.hierarchies.map(
                (hierarchy: { id: any; name: any; is_enabled: any }) => ({
                    id: hierarchy.id,
                    name: hierarchy.name,
                    is_enabled: hierarchy.is_enabled,
                })
            );

            const responseData = {
                ...timeSheetConfig.toJSON(),
                work_location_ids: populatedWorkLocationIds,
                hierarchy_ids: populatedHierarchyIds,
            };

            reply.status(201).send({
                status_code: 201,
                message: "TimeSheet configuration retrieved successfully",
                time_sheet_config_data: responseData,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "TimeSheet configuration data not found",
                time_sheet_config_data: [],
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        handleError(error, reply);
    }
};
export const updateTimeSheetConfigById = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const updates = request.body as Partial<timeSheetConfigInterface>;
    try {
        const timeSheetConfig = await timeSheetConfigModel.findOne({
            where: { id, program_id },
            include: [
                { model: workLocationModel, as: "workLocations" },
                { model: hierarchies, as: "hierarchies" },
                { model: FoundationalDataTypes, as: "foundational_datatypes" },
                { model: CountryModel, as: "countries" },
                { model: stateModel, as: "state" },
                { model: countyModel, as: "county" },
                { model: cityModel, as: "city" },
            ],
        });

        if (!timeSheetConfig) {
            return reply.status(200).send({
                message: "TimeSheet configuration data not found",
                trace_id: generateCustomUUID(),
                time_sheet_config: [],
            });
        }

        if (updates.work_location_ids) {
            await timeSheetConfig.setWorkLocations(updates.work_location_ids);
        }
        if (updates.hierarchy_ids) {
            await timeSheetConfig.setHierarchies(updates.hierarchy_ids);
        }

        if (updates.foundational_data) {
            await timeSheetConfig.setFoundational_datatypes(updates.foundational_data);
        }

        if (updates.remote_country_ids) {
            await timeSheetConfig.setCountries(updates.remote_country_ids);
        }

        if (updates.remote_state_ids) {
            await timeSheetConfig.setState(updates.remote_state_ids);
        }

        if (updates.remote_county_ids) {
            await timeSheetConfig.setCounty(updates.remote_county_ids);
        }

        if (updates.remote_city_ids) {
            await timeSheetConfig.setCity(updates.remote_city_ids);
        }

        await timeSheetConfig.update({
            ...updates,
            version: sequelize.literal('version + 1'),
        });

        reply.status(200).send({
            status_code: 200,
            message: "TimeSheet configuration updated successfully",
            time_sheet_config: timeSheetConfig.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        handleError(error, reply);
    }
};

export const deleteTimeSheetById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const [numRowsDeleted] = await timeSheetConfigModel.update({
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
                time_sheet_config: id,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                message: "TimeSheet configuration not found",
                time_sheet_config: [],
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        handleError(error, reply);
    }
};

export const getAllTimeSheetConfigByProgramId = async (
    request: FastifyRequest<{
        Params: { program_id: string },
        Querystring: {
            page?: number,
            pageSize?: number,
            "info-level"?: string,
            title?: string,
            is_active?: boolean,
            location_type?: string,
            hierarchy_ids?: string[],
            work_location_ids?: string[],
            foundational_data?: string[],
            version?: number,
            time_sheet_format?: string
        }
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
        work_location_ids,
        time_sheet_format,
        version
    } = request.query;

    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    try {
        const attributes = infoLevel === 'detail'
            ? undefined
            : ["id", "program_id", "title", "display_title", "activity_notes", "version", "created_by", "modified_by", "is_deleted", "is_active", "created_on", "modified_on"];

        const whereClause: any = { program_id };

        if (title) {
            whereClause.title = { [Op.like]: `%${title}%` };
        }
        if (typeof is_active === 'string') {
            if (is_active === 'true') {
                whereClause.is_active = true;
            } else if (is_active === 'false') {
                whereClause.is_active = false;
            }
        }

        if (version !== undefined) {
            whereClause.version = version;
        }
        if (time_sheet_format) {
            whereClause.time_sheet_format = time_sheet_format;
        }
        if (hierarchy_ids) {
            const hierarchyIds = Array.isArray(hierarchy_ids)
                ? hierarchy_ids
                : typeof hierarchy_ids === 'string'
                    ? (hierarchy_ids as string).split(',')
                    : [];

            whereClause.hierarchy_ids = {
                [Op.or]: hierarchyIds.map(id => Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col('hierarchy_ids'), JSON.stringify(id)),
                    true
                ))
            };
        }
        if (work_location_ids) { // Adding work_location_ids filter
            const workLocationIdArray = Array.isArray(work_location_ids)
                ? work_location_ids
                : (work_location_ids as string).split(',');
            whereClause.work_location_ids = {
                [Op.or]: workLocationIdArray.map(id =>
                    Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('work_location_ids'), JSON.stringify(id)),
                        true
                    )
                )
            };
        }
        const { count, rows } = await timeSheetConfigModel.findAndCountAll({
            where: whereClause,
            attributes,
            limit,
            offset,
            distinct: true,
            include: [
                {
                    model: hierarchyModel,
                    as: 'hierarchies',
                    attributes: ['id', 'name', 'is_enabled'],
                    through: { attributes: [] }
                },
                {
                    model: workLocationModel,
                    as: 'workLocations',
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                },
                {
                    model: FoundationalDataTypes,
                    as: 'foundational_datatypes',
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                }
            ]
        });

        const sanitizedData = rows.map((item: any) => {
            const { hierarchy_ids, work_location_ids, foundational_data, ...rest } = item.toJSON();
            return rest;
        });

        const totalPages = Math.ceil(count / pageSize);
        const currentPage = page;

        const response = {
            status_code: 200,
            message: sanitizedData.length > 0
                ? "TimeSheet configuration data retrieved successfully"
                : "TimeSheet configuration data not found for the given program",
            time_sheet_config_data: sanitizedData,
            pagination: {
                total_count: count,
                total_pages: totalPages,
                current_page: currentPage,
                page_size: pageSize
            }
        };

        reply.status(200).send(response);
    } catch (error) {
        reply.status(500).send({
            message: "Internal Server Error",
            error,
            trace_id: generateCustomUUID(),
        });
    }
};


const setAssociations = async (newItem: any, timeSheetConfig: timeSheetConfigInterface, transaction: any) => {
    if (timeSheetConfig.hierarchy_ids) {
        await newItem.setHierarchies(timeSheetConfig.hierarchy_ids, { transaction });
    }

    if (timeSheetConfig.work_location_ids) {
        await newItem.setWorkLocations(timeSheetConfig.work_location_ids, { transaction });
    }

    if (timeSheetConfig.foundational_data && timeSheetConfig.foundational_data.value) {
        await newItem.setFoundational_datatypes(timeSheetConfig.foundational_data.value, { transaction });
    }

    if (timeSheetConfig.remote_country_ids) {
        await newItem.setCountries(timeSheetConfig.remote_country_ids, { transaction });
    }

    if (timeSheetConfig.remote_state_ids) {
        await newItem.setState(timeSheetConfig.remote_state_ids, { transaction });
    }

    if (timeSheetConfig.remote_county_ids) {
        await newItem.setCounty(timeSheetConfig.remote_county_ids, { transaction });
    }

    if (timeSheetConfig.remote_city_ids) {
        await newItem.setCity(timeSheetConfig.remote_city_ids, { transaction });
    }
};

export async function timeSheetConfigAdvancedFilter(request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply) {
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
                model: workLocationModel,
                as: 'workLocations',
                attributes: ['id', 'name'],
                through: { attributes: [] }
            },
            {
                model: FoundationalDataTypes,
                as: 'foundational_datatypes',
                attributes: ['id', 'name'],
                through: { attributes: [] }
            }
        ];

        const timeSheetConfigData = await advancedFilter(request, include);

        const totalRecords = timeSheetConfigData.count;
        const currentPageResult = timeSheetConfigData.rows.length;
        const perPage = pagination?.limit ?? 10;
        const currentPage = pagination?.page || 1;
        const lastPage = Math.ceil(totalRecords / perPage);

        const sanitizedData = timeSheetConfigData.rows.map((item: any) => {
            const { hierarchy_ids, work_location_ids, foundational_data, ...rest } = item.toJSON();
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
    const { program_id } = request.params as { program_id: string }
    const { filters = {}, pagination } = request.body as {
        filters?: Record<string, any>;
        pagination?: { page?: number; limit?: number };
    };

    const whereCondition: { [key: string]: any } = { is_deleted: false, program_id: program_id }; // Include program_id in whereCondition
    // Loop through the filters provided by the user
    Object.keys(filters).forEach((field) => {
        const value = filters[field];
        if (field === 'hierarchy_ids') {
            if (Array.isArray(value)) {
                whereCondition[field] = {
                    [Op.or]: value.map(id => Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col(field), JSON.stringify(id)),
                        true
                    ))
                };
            } else if (typeof value === 'string') {
                const ids = value.split(',');
                whereCondition[field] = {
                    [Op.or]: ids.map(id => Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col(field), JSON.stringify(id)),
                        true
                    ))
                };
            }
        } else if (Array.isArray(value)) {
            if (value.length === 2 && !isNaN(Date.parse(value[0])) && !isNaN(Date.parse(value[1]))) {
                // Handle date range filters
                whereCondition[field] = {
                    [Op.between]: [new Date(value[0]), new Date(value[1])]
                };
            } else if (value.length > 0) {
                whereCondition[field] = Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col(field), JSON.stringify(value)),
                    true
                );
            }
        } else if (typeof value === "boolean") {
            // Handle boolean values (e.g., is_active)
            whereCondition[field] = value;
        } else if (typeof value === "string") {
            // Handle string values (e.g., title)
            whereCondition[field] = {
                [Op.like]: `%${value}%`
            };
        } else if (typeof value === "number") {
            whereCondition[field] = value;
        } else if (value instanceof Date || !isNaN(Date.parse(value))) {
            // Handle single date values
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

    console.log("options", options);
    if (offset !== undefined && limit !== undefined) {
        options.offset = offset;
        options.limit = limit;
    }
    const results = await timeSheetConfigModel.findAndCountAll(options);
    return results;
}


export const getAllHierarchies = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { program_id } = request.params;
        const hierarchies = await hierarchyModel.findAll({
            attributes: ['id', 'name'],
            where: { program_id: program_id, is_deleted: false }
        });
        if (hierarchies.length > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "hierarchies retrieved successfully",
                hierarchies: hierarchies,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: " hierarchies not  found",
                hierarchies: [],
                trace_id: generateCustomUUID(),
            });
        }
    } catch (error) {
        handleError(error, reply);
    }
};


export { advancedFilter };
