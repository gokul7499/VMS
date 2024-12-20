

import stateModel from "../models/state.model";
import { stateInterface, StatePayload } from "../interfaces/state.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";


export async function createState(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId=generateCustomUUID();
    try {
        const states = request.body as stateInterface;
        const state_data: any = await stateModel.create({ ...states });
        reply.status(201).send({
            status_code: 201,
            message: "state created succesfully",
            state_date: state_data,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while creating fees configuration',
            error
        });
    }
}

export async function createStateBulk(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId=generateCustomUUID();
    try {
        const { country_id, states }: StatePayload = request.body as StatePayload;

        if (!country_id || !Array.isArray(states) || states.length === 0) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Invalid payload',
                trace_id: traceId,
            });
        }

        const stateRecords = states.map(stateName => ({
            country_id,
            name: stateName
        }));

        const state_data = await stateModel.bulkCreate(stateRecords);

        reply.status(201).send({
            status_code: 201,
            message: 'States created successfully',
            state_data,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while creating states',
            error,
            trace_id: traceId,
        });
    }
}

export async function getStateById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const { id } = request.params;
        console.log("Params:", id);
        const states = await stateModel.findOne({
            where: {
                id,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id",] },
        });
        if (states) {
            reply.status(201).send({
                status_code: 201,
                message: "state get succesfully",
                states: states,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "state data not found",
                states: []
            });
        }
    } catch (error) {
        reply.status(500).send({ message: "An error occurred while fetching state", error });
    }
}
export async function updateStateById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<stateInterface>;
    const traceId=generateCustomUUID();
    try {
        const [states] = await stateModel.update(updates, {
            where: { id }
        });
        if (states === 0) {
            return reply.status(200).send({ message: "state data not found", trace_id: traceId, states: [] });
        }
        return reply.status(201).send({
            status_code: 201,
            message: "state updated successfully",
            states: id,
            trace_id: traceId
        });
    } catch (error) {
        return reply.status(500).send({ message: "Internal Server Error", trace_id:traceId, error });
    }
}



export async function deleteStatesById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const { id } = request.params;
        const [states] = await stateModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                modified_on: Date.now(),
            },
            { where: { id } }
        );
        if (states > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "state deleted successfully",
                states: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ message: "state not found", trace_id: traceId, states: [] });
        }
    } catch (error) {
        console.error("Error deleting state:", error);
        reply.status(500).send({ message: "An error occurred while deleting state", error });
    }
}

export async function getAllStatesByProgramId(
    request: FastifyRequest<{ Querystring: { name?: string; country_id?: string[] } }>,
    reply: FastifyReply
) {
    const { name, country_id } = request.query;
    let whereClause: any = {};

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }

    if (country_id) {
        const countryIds = Array.isArray(country_id)
            ? country_id
            : typeof country_id === 'string'
                ? (country_id as string).split(',')
                : [];

        whereClause.country_id = { [Op.in]: countryIds };
    }
    const traceId=generateCustomUUID();
    try {
        const states = await stateModel.findAll({ where: whereClause });
        if (states.length > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "States retrieved successfully",
                data: states,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "No states found for the given country_id(s)",states:[],trace_id: traceId, });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: "Internal Server Error" });
    }
}



