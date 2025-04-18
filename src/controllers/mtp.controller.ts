import { MtpInterface } from "../interfaces/mtp.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import MtpModel from "../models/mtp.model"
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";
import MtpRepository from "../repositories/mtp.repository";
const mtpRepository = new MtpRepository();

export async function createMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { program_id: programId } = request.params as { program_id: string };
        const mtp = request.body as MtpInterface;
        const user = request.user;

        if (!user) {
            console.log("User not found in request.");
        }

        const userId = user.sub;
        const candidateId = mtp.linked_profiles;

        const duplicateCandidate = await mtpRepository.getPossibleDuplicateCandidate(programId, candidateId);
        console.log("duplicateCandidate", duplicateCandidate);

        let mtpData: any;

        if (duplicateCandidate?.length > 0 && duplicateCandidate[0]?.candidate_id) {
            console.log("Duplicate candidate found. Skipping MTP creation.");
        } else {
            logger({
                trace_id: traceId,
                actor: {
                    user_name: user.preferred_username,
                    user_id: user.sub,
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

            mtpData = await MtpModel.create({
                ...mtp,
                created_by: userId,
                updatedby: userId,
            });

        }

        logger({
            trace_id: traceId,
            actor: {
                user_name: user.preferred_username,
                user_id: user.sub,
            },
            data: request.body,
            eventname: "create mtp",
            status: "success",
            description: mtpData
                ? `MTP created successfully: ${mtpData.id}`
                : "MTP creation skipped due to duplicate candidate.",
            level: "success",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);

        return reply.send({
            status_code: mtpData ? 200 : 204,
            message: mtpData ? "MTP created successfully" 
            : "Duplicate candidate. MTP creation skipped.",
            data: mtpData || null,
            trace_id: traceId,
        });

    } catch (error) {
        logger({
            trace_id: traceId,
            data: request.body,
            eventname: "create mtp",
            status: "error",
            description: "Error creating MTP",
            level: "error",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);

        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating MTP",
            trace_id: traceId,
            error,
        });
    }
}


export async function getAllMtp(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const { program_id: programId } = request.params as { program_id: string };
    const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
    const traceId = generateCustomUUID();
  
    try {
      const offset = (Number(page) - 1) * Number(limit);
      const { data: mtpData, count } = await mtpRepository.getAllMtpData(programId, Number(limit), offset);
  
      return reply.code(200).send({
        status_code: 200,
        message: mtpData.length > 0 
        ? "Mtp data fetched successfully."
         : "No matching records found.",
        mtp_data: mtpData,
        pagination: {
          page: page,
          limit: limit,
          total_count: count,
          total_pages: Math.ceil(count / Number(limit)),
        },
        trace_id: traceId,
      });
    } catch (error: any) {
      return reply.code(500).send({
        status_code: 500,
        message: "Internal Server Error",
        trace_id: traceId,
        error: error.message,
      });
    }
  }
  

export async function getMtpById(
    request: FastifyRequest,
    reply: FastifyReply
) {

    const { program_id:programId,id } = request.params as { program_id: string,id: string };
    console.log("Params:", programId, id);
    const traceId = generateCustomUUID();
    
    try {

        const mtpData = await mtpRepository.getMtpById(programId,id)

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