import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from "../utility/baseService";
import ShiftTypeModel from "../models/shift-type.model";
import { ShiftTypeAttributes } from "../interfaces/shift-type.interface";
import { sequelize } from '../config/instance';
import { Op, QueryTypes } from 'sequelize';
import { getShiftTypesByHierarchiesQuery } from "../utility/queries";
import { decodeToken } from "../middlewares/verifyToken";



export async function getALLShiftType(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'id', 'shift_type_name', 'is_enabled', 'shift_type_category', 'updated_on'];
    const responseFields = ['program_id', 'id', 'shift_type_name', 'is_enabled', 'shift_type_category', 'updated_on', 'shift_type_time', 'time_duration'];
    return baseSearch(request, reply, ShiftTypeModel, searchFields, responseFields);
}

export async function getShiftTypeById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await ShiftTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: 'Shift Type found successfully',
                trace_id: traceId,
                shiftType: item
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                event: [],
                message: 'shiftType not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}


export async function createShiftType(
    request: FastifyRequest,
    reply: FastifyReply,
) {
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
    try {
        const shiftType = request.body as ShiftTypeAttributes;
        const existingShiftType = await ShiftTypeModel.findOne({
            where: { shift_type_name: shiftType.shift_type_name, program_id: shiftType.program_id },
        });
        if (existingShiftType) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Shift type with the name already exists.',
                trace_id: traceId,
            });
        }
        const state_data: any = await ShiftTypeModel.create({
            ...shiftType, created_by: userId,
            updated_by: userId,
        });
        reply.status(201).send({
            status_code: 201,
            message: "shift type created succesfully",
            id: state_data.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function updateShiftType(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const shiftTypeData = request.body as ShiftTypeAttributes;
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
    try {
        const shiftType = await ShiftTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (shiftType) {
            const existingShiftTypeWithSameName = await ShiftTypeModel.findOne({
                where: {
                    shift_type_name: sequelize.where(sequelize.fn('lower', sequelize.col('shift_type_name')), sequelize.fn('lower', shiftTypeData.shift_type_name)),
                    id: { [Op.ne]: id },
                    program_id,
                    is_deleted: false,
                },
            });
            if (existingShiftTypeWithSameName) {
                return reply.status(400).send({
                    status_code: 400,
                    message: "Shift Type With Same Name Already Exists.",
                    trace_id: traceId,
                });
            }
            console.log("existingShiftTypeWithSameName", existingShiftTypeWithSameName)
            await shiftType.update(shiftTypeData, { where: { updated_by: userId } });
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'ShiftType updated successfully.',
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'ShiftType not found.',
            });
        }
    } catch (error) {
        console.error('Error updating shift type:', error);
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}
export async function deleteShiftType(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string, program_id: string };
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
    try {
        const shiftType = await ShiftTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (shiftType) {
            await shiftType.update({ is_deleted: true, updated_by: userId });
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'ShiftType deleted successfully.',
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'ShiftType not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}

export async function getShiftTypesByHierarchies(
    request: FastifyRequest<{ Querystring: ShiftTypeAttributes, Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { shift_type_category, is_enabled, hierarchy_ids } = request.query;
        const { program_id } = request.params;
        const searchFields: any = { is_deleted: false };
        let hierarchyArray;
        if (hierarchy_ids) {
            hierarchyArray = hierarchy_ids.split(",");
            searchFields.hierarchies = { [Op.in]: hierarchyArray };
        }
        if (shift_type_category) {
            searchFields.shift_type_category = shift_type_category;
        }
        if (is_enabled) {
            searchFields.is_enabled = is_enabled;
        }

        if (program_id) {
            searchFields.program_id = program_id;
        }

        const result = await sequelize.query(getShiftTypesByHierarchiesQuery, {
            replacements: {
                program_id,
                hierarchy_ids: hierarchy_ids.split(','),
            },
            type: QueryTypes.SELECT,
        });

        if (result.length === 0) {
            reply.status(200).send({ status_code: 200, trace_id: traceId, message: "Shift types not found", shift_types: [] });
            return;
        }

        reply.status(200).send({
            status_code: 200,
            message: " Shift types found",
            trace_id: traceId,
            total_records: result.length,
            shift_types: result,
        });
    } catch (error: any) {
        reply.status(500).send({ status_code: 500, trace_id: traceId, error: "Internal Server Error" });
    }
}

export async function getShiftCategories(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const categories = await ShiftTypeModel.findAll({
            where: {
                program_id,
                is_deleted: false,
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('shift_type_category')), 'shift_type_category']]
        });

        if (categories) {
            const categoryValues = categories.map((category: any) => category.shift_type_category);
            reply.status(200).send({
                status_code: 200,
                message: 'Shift categories found successfully!',
                trace_id: traceId,
                shift_categories: categoryValues
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                shift_categories: [],
                message: 'Shift categories not found.',
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

export const getShiftTypeFilter = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const body = request.body as {
        program_id?: string;
        id?: string;
        shift_type_name?: string;
        is_enabled?: boolean;
        shift_type_category?: string;
        updated_on?: string;
        page?: number;
        limit?: number;
    };

    const page = body.page ?? 1;
    const limit = body.limit ?? 10;

    const whereClause: any = {};

    if (body.program_id) whereClause.program_id = body.program_id;
    if (body.id) whereClause.id = body.id;
    if (body.shift_type_name) whereClause.shift_type_name = { [Op.like]: `%${body.shift_type_name}%` };
    if (body.is_enabled !== undefined) whereClause.is_enabled = body.is_enabled;
    if (body.shift_type_category) whereClause.shift_type_category = { [Op.like]: `%${body.shift_type_category}%` };
    if (Array.isArray(body.updated_on) && body.updated_on.length === 2) {
        const [startDate, endDate] = body.updated_on.map(date => new Date(date).getTime());

        if (!isNaN(startDate) && !isNaN(endDate)) {
          whereClause.updated_on = { [Op.between]: [startDate, endDate] };
        }
      }
    try {
        const { rows: shiftTypes, count } = await ShiftTypeModel.findAndCountAll({
            where: whereClause,
            attributes: [
                "program_id",
                "id",
                "shift_type_name",
                "is_enabled",
                "shift_type_category",
                "updated_on",
                "shift_type_time",
                "time_duration",
            ],
            order: [["updated_on", "DESC"]],
            offset: (page - 1) * limit,
            limit: limit,
        });

        return reply.status(200).send({
            status_code: 200,
            shift_types: shiftTypes,
            total_records: count,
            page: page,
            limit: limit,
            message: "Shift Types fetched successfully",
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while fetching shift types",
            error: error,
            trace_id: traceId,
        });
    }
}
