import { FastifyRequest , FastifyReply } from "fastify";
import LeaveTypeModel from "../models/leave-type.model";
import { LeaveTypeInterface } from "../interfaces/leave-type.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from "../middlewares/verifyToken";


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
      const item: any = await LeaveTypeModel.create({ ...leaveType,created_by:userId,modified_by:userId });
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
    const traceId = generateCustomUUID();;
    try {
        const leaveType = await LeaveTypeModel.findAll({
            order: [["name", "ASC"]],
        });

        reply.status(200).send({
            status_code: 200,
            message:
                leaveType.length === 0
                    ? "No Leave types found"
                    : "Leave types featched successfully..!",
            leave_types: leaveType,
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to fetch leave types",
            trace_id: traceId,
            error,
        });
    }
};