import { MtpInterface } from "../interfaces/mtp.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import MtpModel from "../models/mtp.model"
import generateCustomUUID from "../utility/genrateTraceId";
import { logger } from "../utility/loggerService";
import MtpRepository from "../repositories/mtp.repository";
import { findDuplicateCandidate } from "../utility/create-candidate";
const mtpRepository = new MtpRepository();

export async function createMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { program_id: programId } = request.params as { program_id: string };
        const mtp = request.body as MtpInterface;
        const user = request.user;
        const token = request.headers.authorization;

        const userId = user?.sub;
        const mtpCandidateId = mtp.mtp_candidate_id;
        const getCandidateData=await mtpRepository.getCandidate(programId,mtpCandidateId)
        const TalentName=getCandidateData?.[0]?.candidate_name

        const talentData = await mtpRepository.getAllMtp(programId);

        const talentCandidateIds = talentData.reduce((acc: string[], row: any) => {
            return acc.concat(row.candidate_id);
        }, []);

        const candidateData = [...talentCandidateIds, mtpCandidateId].flat();
        if (!talentData || talentData.length === 0) {
            console.log("No existing MTP data found, creating new MTP");
            const mtpData = await MtpModel.create({
                ...mtp,
                talent_name: TalentName,
                created_by: userId,
                updatedby: userId,
            });

            logger({
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "create mtp",
                status: "success",
                description: `MTP created successfully: ${mtpData.id}`,
                level: "success",
                action: request.method,
                url: request.url,
                is_deleted: false,
            }, MtpModel);

            return reply.send({
                status_code: 200,
                message: "MTP created successfully",
                data: mtpData,
                trace_id: traceId,
            });
        }
        if (candidateData.length > 1) {

          findDuplicateCandidate(candidateData, programId, userId, token,mtpCandidateId);
            logger({
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "create mtp",
                status: "skipped",
                description: `Duplicate detected. Added to possible duplicates. Candidate ID(s): ${candidateData.join(', ')}`,
                level: "warn",
                action: request.method,
                url: request.url,
                is_deleted: false,
            }, MtpModel);

            return reply.send({
                message: "Duplicate detected. Added to possible duplicates.",
                trace_id: traceId
            });
        }
        const mtpData = await MtpModel.create({
            ...mtp,
            talent_name: TalentName,
            created_by: userId,
            updatedby: userId,
        });
        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "create mtp",
            status: "success",
            description: `MTP created successfully: ${mtpData.id}`,
            level: "success",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);

        return reply.send({
            status_code: 200,
            message: "MTP created successfully",
            data: mtpData,
            trace_id: traceId,
        });

    } catch (error: any) {
        logger({
            trace_id: traceId,
            data: request.body,
            eventname: "create mtp",
            status: "error",
            description: `Error creating MTP: ${error.message}`,
            level: "error",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);

        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating MTP",
            trace_id: traceId,
            error: error.message,
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