
import countyModel from "../models/county.model";
import { CountyInterface } from "../interfaces/county.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";
import { decodeToken } from "../middlewares/verifyToken";

export async function createCounty(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        const county = request.body as CountyInterface;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;

        const county_data: any = await countyModel.create({ ...county, created_by: userId, updatedby: userId });
        reply.status(201).send({
            status_code: 201,
            message: "county created succesfully",
            county_data: county_data?.id,
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code:500,
            message: 'An error occurred while creating county',
            error
        });
    }
}
export async function getCountyById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        console.log("Params:", id);
        const county = await countyModel.findOne({
            where: {
                id,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id",] },
        });
        if (county) {
            reply.status(201).send({
                status_code: 201,
                message: "county get succesfully",
                county: county,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "county data not found",
                county: []
            });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: "An error occurred while fetching county", error });
    }
}
export async function updateCountyById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<CountyInterface>;
    try {
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;

        const [county] = await countyModel.update(updates, {
           
            where: { id }
        });
        if (county === 0) {
            return reply.status(200).send({ message: "county data not found", trace_id: generateCustomUUID(), county: [] });
        }
        return reply.status(201).send({
            status_code: 201,
            message: "county updated successfully",
            county: id,
            trace_id:traceId,
        });
    } catch (error) {
        return reply.status(500).send({ status_code:500,message: "Internal Server Error", trace_id: traceId, error });
    }
}

export async function deleteCountyById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        const { id } = request.params;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;

        const [county] = await countyModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_on: Date.now(),
                updated_by: userId
            },
            { where: { id } }
        );
        if (county > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "county deleted successfully",
                county: id,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({ status_code:200,message: "county not found", trace_id: traceId, county: [] });
        }
    } catch (error) {
        reply.status(500).send({ status_code:500,message: "An error occurred while deleting county", error });
    }
}
export async function getAllCounty(request: FastifyRequest<{ Querystring: { name?: string; state_id?: string[] } }>, reply: FastifyReply) {
    const { name, state_id } = request.query;
    const traceId = generateCustomUUID();
    let whereClause: any = {};

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }

    if (state_id) {
        const stateIds: string[] = Array.isArray(state_id)
            ? state_id
            : (state_id as string).split(',');
        whereClause.state_id = { [Op.in]: stateIds };
    }

    try {
        const counties = await countyModel.findAll({ where: whereClause });
        if (counties.length > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "Counties retrieved successfully",
                data: counties,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "No counties found for the given state_id(s)", counties: [], trace_id: generateCustomUUID(), });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500, message: "Internal Server Error" });
    }
}