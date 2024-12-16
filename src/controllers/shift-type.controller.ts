import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from "../utility/baseService";
import ShiftTypeModel from "../models/shift-type.model";
import { ShiftTypeAttributes } from "../interfaces/shift-type.interface";
import { sequelize } from '../config/instance';
import { Op, QueryTypes } from 'sequelize';
import { getShiftTypesByHierarchiesQuery } from "../utility/queries";



export async function getALLShiftType(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'id', 'shift_type_name', 'is_enabled', 'shift_type_category', 'modified_on'];
    const responseFields = ['program_id', 'id', 'shift_type_name', 'is_enabled', 'shift_type_category', 'modified_on', 'shift_type_time', 'time_duration'];
    return baseSearch(request, reply, ShiftTypeModel, searchFields, responseFields);
}

export async function getShiftTypeById(request: FastifyRequest, reply: FastifyReply) {
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
                trace_id: generateCustomUUID(),
                shiftType: item
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: generateCustomUUID(),
                event: [],
                message: 'shiftType not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: generateCustomUUID(),
            message: "Internal Server Error",
            error
        });
    }
}


export async function createShiftType(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        const shiftType = request.body as ShiftTypeAttributes;
        const existingShiftType = await ShiftTypeModel.findOne({
            where: { shift_type_name: shiftType.shift_type_name, program_id: shiftType.program_id },
        });
        if (existingShiftType) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Shift type with the name already exists.',
                trace_id: generateCustomUUID(),
            });
        }
        const state_data: any = await ShiftTypeModel.create({ ...shiftType });
        reply.status(201).send({
            status_code: 201,
            message: "shiftType created succesfully",
            id: state_data.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while creating fees configuration',
            error
        });
    }
}

export async function updateShiftType(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const shiftTypeData = request.body as ShiftTypeAttributes;
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
                    trace_id: generateCustomUUID(),
                });
            }
            console.log("existingShiftTypeWithSameName", existingShiftTypeWithSameName)
            await shiftType.update(shiftTypeData);
            reply.status(200).send({
                status_code: 200,
                trace_id: generateCustomUUID(),
                message: 'ShiftType updated successfully.',
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: generateCustomUUID(),
                message: 'ShiftType not found.',
            });
        }
    } catch (error) {
        console.error('Error updating shift type:', error);
        reply.status(500).send({
            status_code: 500,
            trace_id: generateCustomUUID(),
            message: "Internal Server Error",
            error
        });
    }
}
export async function deleteShiftType(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string, program_id: string };
    try {
        const shiftType = await ShiftTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (shiftType) {
            await shiftType.update({ is_deleted: true });
            reply.status(200).send({
                status_code: 200,
                trace_id: generateCustomUUID(),
                message: 'ShiftType deleted successfully.',
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: generateCustomUUID(),
                message: 'ShiftType not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: generateCustomUUID(),
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
            reply.status(200).send({ trace_id: traceId, message: "Shift types not found", shift_types: [] });
            return;
        }

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            total_records: result.length,
            shift_types: result,
        });
    } catch (error: any) {
        reply.status(500).send({ trace_id: traceId, error: "Internal Server Error" });
    }
}

export async function getShiftCategories(request: FastifyRequest, reply: FastifyReply) {
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
                trace_id: generateCustomUUID(),
                shift_categories: categoryValues
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: generateCustomUUID(),
                shift_categories: [],
                message: 'Shift categories not found.',
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: generateCustomUUID(),
            message: "Internal Server Error",
            error: error.message
        });
    }
}