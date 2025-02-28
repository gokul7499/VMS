import { FastifyRequest, FastifyReply } from "fastify";
import LeaveTypeModel from "../models/leave-type.model";
import { LeaveTypeInterface } from "../interfaces/leave-type.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from "../middlewares/verifyToken";
import { Op } from "sequelize";


export async function createLeaveType(request: FastifyRequest, reply: FastifyReply) {
    const { ...leaveType } = request.body as LeaveTypeInterface;

    try {
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
        const existingLeaveType = await LeaveTypeModel.findOne({
            where: { name: { [Op.like]: leaveType.name?.trim() } }
        });

        if (existingLeaveType) {
            return reply.status(409).send({
                status_code: 409,
                message: "Name already exist"
            });
        }
        const item: any = await LeaveTypeModel.create({ ...leaveType, created_by: userId, modified_by: userId });
        reply.status(201).send({
            status_code: 201,
            id: item.id,
            message: 'Leave type created successfully..!',
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            error: error?.parent?.sqlMessage
        });
    }
}

export const getLeaveTypes = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();

    try {
    
        const query = request.query as any;
        const pageNumber = query.page ? parseInt(query.page, 10) : 1;
        const pageSize = query.limit ? parseInt(query.limit, 10) : 10;

        
        if (isNaN(pageNumber) || pageNumber < 1) {
            return reply.status(400).send({
                status_code: 400,
                message: "Invalid page number",
                trace_id: traceId
            });
        }

        if (isNaN(pageSize) || pageSize < 1) {
            return reply.status(400).send({
                status_code: 400,
                message: "Invalid limit",
                trace_id: traceId
            });
        }

        const offset = (pageNumber - 1) * pageSize;
        const { count, rows: leaveTypes } = await LeaveTypeModel.findAndCountAll({
            order: [["name", "ASC"]],
            limit: pageSize,
            offset: offset,
        });

        reply.status(200).send({
            status_code: 200,
            message: leaveTypes.length === 0
                ? "No Leave types found"
                : "Leave types fetched successfully..!",
            leave_types: leaveTypes,
            trace_id: traceId,
            pagination: {
                total_records: count,
                total_pages: Math.ceil(count / pageSize),
                current_page: pageNumber,
                page_size: pageSize,
            },
        });

    } catch (error) {

        const err = error as Error;
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to fetch leave types",
            trace_id: traceId,
            error: err.message
        });
    }
};

