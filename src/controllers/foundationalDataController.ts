import { FastifyRequest, FastifyReply } from "fastify";
import foundationalData from "../models/foundationalDataModel";
import { FoundationalDataInterface } from "../interfaces/foundationalDataInterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { countFoundationDataQuery, foundationDataQuery } from "../utility/queries";
import FoundationalDataTypes from "../models/foundationalDatatypesModel";
import User from "../models/userModel";

export async function getFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    try {
        const params = request.params as { program_id: string };
        const query = request.query as {
            id?: string;
            name?: string;
            is_enabled?: string;
            modified_on?: string;
            manager_id?: string;
            code?: string;
            foundational_data_type_id?: string;
            first_name: string;
            page?: string;
            limit?: string;
        };

        const page = parseInt(query.page ?? '1');
        const limit = parseInt(query.limit ?? '10');
        const offset = (page - 1) * limit;

        let modified_on_start = null;
        let modified_on_end = null;

        if (query.modified_on) {
            const modifiedOnRange = query.modified_on.split(',');
            if (modifiedOnRange.length === 2) {
                modified_on_start = modifiedOnRange[0];
                modified_on_end = modifiedOnRange[1];
            }
        }

        const filters: any = {
            program_id: params.program_id,
            id: query.id ?? null,
            name: query.name ? `%${query.name}%` : null,
            is_enabled: query.is_enabled !== undefined ? query.is_enabled === 'true' : null,
            modified_on_start,
            modified_on_end,
            manager_id: query.manager_id ?? null,
            code: query.code ? `%${query.code}%` : null,
            foundational_data_type_id: query.foundational_data_type_id ?? null,
            first_name: query.first_name ? `%${query.first_name}%` : null,
            limit,
            offset
        };

        const [foundationalDataResult, countResult] = await Promise.all([
            sequelize.query(foundationDataQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
            }),
            sequelize.query(countFoundationDataQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
            })
        ]);

        const totalRecords = (countResult[0] as any).total;

        const foundationalDataArray = foundationalDataResult.map((row: any) => ({
            ...row,
            slug: row.slug,
            depended_fields: typeof row.depended_fields === 'string' ? JSON.parse(row.depended_fields) : row.depended_fields
        }));

        let foundationalDataTypeName = 'null';
        if (foundationalDataArray.length > 0) {
            foundationalDataTypeName = foundationalDataArray[0].foundational_data_type_name;
        } else if (query.foundational_data_type_id) {
            const foundationalDataType: any = await FoundationalDataTypes.findByPk(query.foundational_data_type_id, {
                attributes: ['name']
            });
            foundationalDataTypeName = foundationalDataType.name || null;
        }

        if (foundationalDataResult.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                foundational_data_type_name: foundationalDataTypeName,
                message: "foundational data not found",
                foundational_data: [],
                trace_id
            });
        }

        reply.status(200).send({
            statusCode: 200,
            foundational_data_type_name: foundationalDataTypeName,
            total_records: totalRecords,
            foundational_data: foundationalDataArray,
            trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id
        });
    }
}

export async function getFoundationalDataById(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const trace_id = generateCustomUUID();
    try {
        const { program_id, id } = request.params;
        const foundational_data = await foundationalData.findOne(
            {
                where: { program_id, id },
                include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'first_name', 'last_name']
                }]
            }
        );
        if (foundational_data) {
            reply.status(200).send({
                statusCode: 200,
                message: 'FoundationalData fetch Successfully.',
                foundational_data: foundational_data,
                trace_id
            });
        } else {
            reply.status(200).send({
                statusCode: 200,
                message: 'FoundationalData Not Found.',
                trace_id
            });
        }
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching FoundationalData.',
            trace_id
        });
    }
}

export async function createFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const foundational_data = request.body as FoundationalDataInterface;
    const program_id = foundational_data.program_id;
    const name = foundational_data.name;
    const trace_id = generateCustomUUID();

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
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
            eventname: "creating foundational data",
            status: "in_progress",
            description: `Creating foundational data for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        foundationalData
    );
    try {
        const existingFoundationalDataWithSameName = await foundationalData.findOne({
            where: { name, program_id },
        });

        if (existingFoundationalDataWithSameName) {
            return reply.status(400).send({
                statusCode: 400,
                message: "Master Data Already Exist.",
                trace_id
            });
        }

        const foundational_Data = await foundationalData.create({ ...foundational_data });

        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created foundational data",
                status: "success",
                description: `Created foundational data for ${program_id} successfully: ${foundational_Data.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            foundationalData
        );

        reply.status(201).send({
            statusCode: 201,
            foundational_data_id: foundational_Data.id,
            trace_id,
            message: 'FoundationalData Created Successfully.',
        });

    } catch (error) {
        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating foundational data",
                status: "error",
                description: `Error creating foundational data for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            foundationalData
        );

        reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while creating FoundationalData.',
            trace_id,
        });
    }
}

export async function updateFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string, id: string };
    let { name } = request.body as { name: string }
    name = name.trim();
    try {
        const existingFoundationalDataWithSameName = await foundationalData.findOne({
            where: {
                name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', name)),
                id: { [Op.ne]: id },  // Exclude the current record's ID from the search
                program_id,  // Only consider records from the specified program_id
                is_deleted: false,     // Only consider records that are not deleted
            }
        });

        if (existingFoundationalDataWithSameName) {
            return reply.status(400).send({
                statusCode: 400,
                message: "Master Data Already Exist.",
                trace_id,
            });
        }

        const [updatedCount] = await foundationalData.update(request.body as FoundationalDataInterface, { where: { program_id, id } });
        if (updatedCount > 0) {
            reply.send({
                statusCode: 201,
                message: 'FoundationalData updated successfully.',
                trace_id,
            });
        } else {
            reply.status(200).send({
                statusCode: 200,
                message: 'FoundationalData not found.',
                trace_id,
            });
        }
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal Server error',
            trace_id,
        });
    }
}

export async function deleteFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const foundational_data = await foundationalData.findOne({ where: { program_id, id } });
        if (foundational_data) {
            await foundationalData.update({ is_deleted: true, is_enabled: false }, { where: { program_id, id } });
            reply.status(204).send({
                statusCode: 204,
                message: 'FoundationalData deleted successfully.',
                trace_id,
            });
        } else {
            reply.status(200).send({
                statusCode: 200,
                message: 'FoundationalData not found.',
                trace_id,
            });
        }
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while deleting FoundationalData.',
            trace_id,
        });
    }
}
