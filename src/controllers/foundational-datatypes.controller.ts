import { FastifyRequest, FastifyReply } from 'fastify';
import foundationalDataTypes from '../models/foundational-datatypes.model';
import { FoundationalDataTypesInterface } from '../interfaces/foundational-datatypes.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import foundationalDataModel from '../models/foundational-data.model';
import { sequelize } from '../config/instance';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { FoundationalDataInterface } from '../interfaces/foundational-data.interface';
import FoundationalData from '../models/foundational-data.model';

export const createFoundationalDataTypes = async (request: FastifyRequest, reply: FastifyReply) => {
    const foundationalDataPayload = request.body as Omit<FoundationalDataTypesInterface, '_id'>;
    const { program_id } = request.params as { program_id: string };
    const name = foundationalDataPayload.name;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
    console.log("uuu", userId)

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating foundational data types",
            status: "success",
            description: `Creating foundational data types for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        foundationalDataTypes
    );

    try {
        const existingFoundationalDataTypeWithSameName = await foundationalDataTypes.findOne({
            where: { name, program_id },
        });

        if (existingFoundationalDataTypeWithSameName) {
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data Type Already Exists",
                trace_id: traceId,
            });
        }

        const foundationalData: any = await foundationalDataTypes.create({
            ...foundationalDataPayload,
            program_id,
            created_by: userId,
            modified_by: userId,
            created_on: Date.now(),
            modified_on: Date.now(),
        });
        reply.status(201).send({
            status_code: 201,
            message: "Data create successfully",
            data: {
                id: foundationalData?.id,
                name: foundationalData?.name,
            },
            trace_id: traceId,
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created foundational data types",
                status: "success",
                description: `Created foundational data types for ${program_id} successfully: ${foundationalData?.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            foundationalDataTypes
        );
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating foundational data types",
                status: "error",
                description: `Error creating foundational data types for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            foundationalDataTypes
        );

        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating foundation datatype',
            trace_id: traceId,
            error: error.message
        });
    }
};

export const updateFoundationalDataTypes = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { id: string, program_id: string };
    const foundationalData = request.body as FoundationalDataTypesInterface;
    let { name } = request.body as { name: string };
    name = name.trim();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized-Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    try {
        const existingFoundationalDataTypeWithSameName = await foundationalDataTypes.findOne({
            where: {
                name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', name)),
                id: { [Op.ne]: id },  // Exclude the current record's ID from the search
                program_id,  // Only consider records from the specified program_id
                is_deleted: false,     // Only consider records that are not deleted
            }
        });

        if (existingFoundationalDataTypeWithSameName) {
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data Type Already Exist.",
                trace_id: traceId,
            });
        }
        const data = await foundationalDataTypes.findByPk(id);
        if (data) {
            await data.update({ ...foundationalData, modified_on: Date.now(), modified_by: userId, });
            reply.status(201).send({
                status_code: 201,
                foundational_datatype_id: id,
                message: 'Foundational data type updated successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Foundational Datatypes not found',
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating foundational data',
            trace_id: traceId,
        });
    }
}

export const deleteFoundationalDataTypes = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized-Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    try {
        const { id } = request.params as { id: string };
        const data = await foundationalDataTypes.findOne({
            where: { id },
        });

        if (!data) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Foundational Datatypes not found',
                trace_id: traceId,
            });
        }

        await data.update({ is_enabled: false, is_deleted: true, modified_by: userId, });
        reply.status(204).send({
            status_code: 204,
            foundational_datatype_id: id,
            message: 'Foundational data type Deleted Successfully',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting foundational data',
            trace_id: traceId,
        });
    }
}

export async function getFoundationalDataTypeById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    try {
        const foundationalDataType: any = await foundationalDataTypes.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
            attributes: ['id', 'name', 'description', 'is_enabled', 'created_on', 'modified_on', 'program_id', 'configuration', 'associations']
        });

        if (foundationalDataType) {
            const foundationalDataCount = await foundationalDataModel.count({
                where: {
                    foundational_data_type_id: id,
                    is_deleted: false
                }
            });

            const associationIds = foundationalDataType.associations || [];

            const associatedDataTypes = await foundationalDataTypes.findAll({
                where: {
                    id: associationIds,
                    is_deleted: false
                },
                attributes: ['id', 'name']
            });

            const foundationalDataTypeResponse = {
                ...foundationalDataType.dataValues,
                foundational_data_count: foundationalDataCount,
                associated_data_types: associatedDataTypes
            };

            reply.status(200).send({
                status_code: 200,
                message: "Foundational data get successfully",
                foundational_data: foundationalDataTypeResponse,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Foundational datatype not found',
                foundational_data: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function getAllFoundationalDataTypes(
    request: FastifyRequest<{
        Querystring: {
            name?: string;
            is_enabled?: string;
            modified_on?: string;
            timesheet_master_data?: string;
            user_association_exclude?: string;
            page?: string;
            limit?: string;
        };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const responseFields = [
        'id',
        'program_id',
        'name',
        'is_enabled',
        'modified_on',
        'description',
        'configuration',
    ];
    const { program_id } = request.params as { program_id: string };
    const {
        name,
        is_enabled,
        modified_on,
        timesheet_master_data,
        user_association_exclude,
        page = '1',
        limit = '10',
    } = request.query;

    try {
        const filters: any = { program_id, is_deleted: false };

        if (name) filters.name = { [Op.like]: `%${name}%` };
        if (is_enabled !== undefined) filters.is_enabled = is_enabled === 'true';
        if (modified_on) {
            const modifiedOnRange = modified_on.split(',').map(Number);
            if (modifiedOnRange.length === 2) {
                filters.modified_on = { [Op.between]: [modifiedOnRange[0], modifiedOnRange[1]] };
            }
        }
        if (timesheet_master_data !== undefined) {
            filters['configuration.timesheet_master_data'] = timesheet_master_data === 'true';
        }
        if (user_association_exclude !== undefined) {
            filters['configuration.user_association_exclude'] = user_association_exclude === 'true';
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { rows: foundationalDataItems, count: totalRecords } =
            await foundationalDataTypes.findAndCountAll({
                where: filters,
                attributes: responseFields,
                offset,
                limit: Number(limit),
                order: [['modified_on', 'DESC']],
            });

        if (!foundationalDataItems.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Foundational data not found',
                foundationalData: [],
                trace_id: traceId,
            });
        }

        const foundationalDataTypeIds = foundationalDataItems.map((item) => item.dataValues.id);

        const foundationalDataCounts = await foundationalDataModel.findAll({
            where: {
                foundational_data_type_id: { [Op.in]: foundationalDataTypeIds },
                is_deleted: false,
            },
            attributes: [
                'foundational_data_type_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['foundational_data_type_id'],
        });

        const foundationalDataCountMap = foundationalDataCounts.reduce(
            (map: Map<string, number>, item: any) => {
                map.set(item.dataValues.foundational_data_type_id, item.dataValues.count);
                return map;
            },
            new Map<string, number>()
        );

        const populatedFoundationalData = foundationalDataItems.map((item) => ({
            ...item.dataValues,
            modified_on: item.dataValues.modified_on
                ? Number(item.dataValues.modified_on)
                : null,
            foundational_data_count: foundationalDataCountMap.get(item.dataValues.id) ?? 0,
        }));

        reply.send({
            status_code: 200,
            message: 'Foundational get successfully',
            total_records: populatedFoundationalData.length,
            foundationalData: populatedFoundationalData,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id: traceId,
        });
    }
}

export async function createFoundationalDataInBulk(request: FastifyRequest, reply: FastifyReply) {
    const foundational_data_list = request.body as FoundationalDataInterface[];
    const traceId = generateCustomUUID();
    const {program_id}=request.params as {program_id:string}

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;
    
    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "bulk creating foundational data",
            status: "in_progress",
            description: "Bulk creation of foundational data started",
            level: 'info',
            action: request.method,
            url: request.url,
            is_deleted: false
        },
        FoundationalData
    );

    try {
        const createdEntries = [];
        const failedEntries = [];

        for (const foundational_data of foundational_data_list) {
            const { name } = foundational_data;
            try {
                const existingData = await FoundationalData.findOne({
                    where: { name, program_id },
                });

                if (existingData) {
                    failedEntries.push({
                        name,
                        program_id,
                        message: "Master Data Already Exists."
                    });
                    continue;
                }

                const newEntry = await FoundationalData.create({
                    ...foundational_data,
                    created_by: userId,
                    modified_by: userId,
                    program_id:program_id
                });
                createdEntries.push(newEntry.id);
            } catch (error: any) {
                failedEntries.push({
                    name,
                    program_id,
                    message: error.message
                });
            }
        }

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: { createdEntries, failedEntries },
                eventname: "bulk created foundational data",
                status: "completed",
                description: `Bulk creation completed with ${createdEntries.length} successes and ${failedEntries.length} failures`,
                level: 'info',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            FoundationalData
        );

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: 'Foundational data created successfully.',
        });
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                eventname: "bulk creating foundational data",
                status: "error",
                description: "Error in bulk creating foundational data",
                level: 'error',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            FoundationalData
        );

        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while processing bulk Foundational Data.',
            trace_id: traceId,
            error: error.message
        });
    }
}
