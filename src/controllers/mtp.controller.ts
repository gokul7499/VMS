import { MtpInterface } from "../interfaces/mtp.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import MtpModel from "../models/mtp.model"
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";
import MtpRepository from "../repositories/mtp.repository";
const mtpRepository = new MtpRepository()

export async function createMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        const mtp = request.body as MtpInterface;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;

        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating mtp",
            status: "info",
            description: "Attempting to create a new mtp record",
            level: "info",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);

        const mtpData: any = await MtpModel.create(
            {
                ...mtp,
                created_by: userId,
                updatedby: userId
            });

        reply.status(201).send({
            status_code: 201,
            message: "mtp created successfully",
            mtp_data: mtpData?.id,
            trace_id: traceId,
        });

        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "create mtp",
            status: "success",
            description: `mtp created successfully: ${mtpData?.id}`,
            level: "success",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);
    } catch (error) {
        logger({
            trace_id: traceId,

            data: request.body,
            eventname: "create mtp",
            status: "error",
            description: "Error creating mtp",
            level: "error",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);

        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating mtp",
            trace_id: traceId,
            error,
        });
    }
}


export async function getAllMtp(
    request: FastifyRequest,
    reply: FastifyReply
) {

    const { program_id:programId } = request.params as { program_id: string };
    const traceId = generateCustomUUID();
    
    try {

        const mtpData = await mtpRepository.getAllMtpData(programId)

        if (mtpData && mtpData.length > 0) {
            return reply.code(200).send({
                status_code: 200,
                message: "Mtp data get successfully.",
                mtp_data: mtpData,
                trace_id: traceId
            });
        } else {
            return reply.code(200).send({
                status_code: 200,
                message: "No matching records found.",
                mtp_data: [],
                trace_id: traceId
            });
        }
    } catch (error: any) {
        return reply.code(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message
        });
    }
}