import { MtpInterface } from "../interfaces/mtp.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import MtpModel from "../models/mtp.model"
import generateCustomUUID from "../utility/genrateTraceId";
import { logger } from "../utility/loggerService";
import MtpRepository from "../repositories/mtp.repository";
import { findDuplicateCandidate } from "../utility/create-candidate";
import { sequelize } from "../config/instance";
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
        const getCandidateData = await mtpRepository.getCandidate(programId, mtpCandidateId)
        const TalentName = getCandidateData?.[0]?.candidate_name
        const paylod = {
            ...mtp,
            talent_name: TalentName
        }
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

            findDuplicateCandidate(candidateData, programId, userId, token, mtpCandidateId, paylod);
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
                message: "Duplicate detected. Added to possible duplicates."
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

    const {
        page = 1,
        limit = 10,
        talent_name: talentName,
        mtp_id: mtpId,
        do_not_rehire: donNotRehire,
        updated_on: updatedOn,
        linked_profiles: linkedProfiles
    } = request.query as {
        page?: number;
        limit?: number;
        talent_name?: string;
        mtp_id?: string;
        do_not_rehire?: string;
        updated_on?: any;
        linked_profiles?: number;
    };

    const traceId = generateCustomUUID();

    try {
        const offset = (Number(page) - 1) * Number(limit);

        const { data: mtpData, count } = await mtpRepository.getAllMtpData(
            programId,
            Number(limit),
            offset,
            talentName,
            mtpId,
            donNotRehire,
            updatedOn,
            linkedProfiles
        );

        return reply.code(200).send({
            status_code: 200,
            message:
                mtpData.length > 0
                    ? 'Mtp data fetched successfully.'
                    : 'No matching records found.',
            mtp_data: mtpData,
            pagination: {
                page,
                limit,
                total_count: count,
                total_pages: Math.ceil(count / Number(limit)),
            },
            trace_id: traceId,
        });
    } catch (error: any) {
        return reply.code(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function getMtpById(
    request: FastifyRequest,
    reply: FastifyReply
) {

    const { program_id: programId, id } = request.params as { program_id: string, id: string };
    const traceId = generateCustomUUID();

    try {

        const [mtpData] = await mtpRepository.getMtpById(programId, id)

        if (mtpData) {
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


export async function linkUnlinkMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    let transaction;
    try {
        const { program_id: programId, id } = request.params as { program_id: string, id: string };
        const { action, mtp_candidate_id: mtpCandidateId } = request.body as { action: string, mtp_candidate_id: string };
        const user = request.user;
        const userId = user?.sub;

        if (!['Link', 'Unlink'].includes(action)) {
            console.warn(`Invalid action.`);
            return reply.status(400).send({
                status_code: 400,
                message: "Invalid action. Must be 'Link' or 'Unlink'",
                trace_id: traceId
            });
        }

        transaction = await sequelize.transaction();

        const mtp = await MtpModel.findOne({
            where: { id, program_id: programId },
            transaction
        });

        if (!mtp) {
            console.warn(`MTP not found for ID: ${id}`);
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: "MTP not found",
                trace_id: traceId
            });
        }

        const currentLinks = Array.isArray(mtp.linked_profiles) ? mtp.linked_profiles : [];
        console.log(`Current linked_profiles:`, currentLinks);

        if (action === 'Link') {
            if (!currentLinks.includes(mtpCandidateId)) {
                currentLinks.push(mtpCandidateId);
                console.log(`Updated linked_profiles after linking:`, currentLinks);

                const updateRes = await MtpModel.update(
                    {
                        linked_profiles: currentLinks
                    },
                    {
                        where: { id, program_id: programId },
                        transaction
                    }
                );
                console.log(`Link update result:`, updateRes);

                const deleteRes = await MtpModel.destroy({
                    where: {
                        mtp_candidate_id: mtpCandidateId,
                        program_id: programId
                    },
                    transaction
                });
                console.log(`Candidate MTP deleted result:`, deleteRes);
            }

            await transaction.commit();

            return reply.send({
                status_code: 200,
                message: "MTP linked successfully!",
                trace_id: traceId
            });
        } else if (action === 'Unlink') {

            if (!currentLinks.includes(mtpCandidateId)) {
                console.warn(`Candidate ID not found in linked_profiles.`);
                await transaction.rollback();
                return reply.status(400).send({
                    status_code: 400,
                    message: "Candidate ID not found in linked_profiles.",
                    trace_id: traceId
                });
            }

            const updatedLinks = currentLinks.filter(id => id !== mtpCandidateId);
            console.log(`linked_profiles after unlinking:`, updatedLinks);

            await MtpModel.update(
                {
                    linked_profiles: updatedLinks
                },
                {
                    where: { id, program_id: programId },
                    transaction
                }
            );

            const getCandidateData = await mtpRepository.getCandidate(programId, mtpCandidateId);
            const TalentName = getCandidateData?.[0]?.candidate_name;

            const newMtp = await MtpModel.create({
                mtp_candidate_id: mtpCandidateId,
                talent_name: TalentName,
                program_id: programId,
                linked_profiles: [],
                created_by: userId,
                modified_by: userId,
            }, { transaction });

            console.log(`New MTP created after unlink:`, newMtp);
            await transaction.commit();

            return reply.send({
                status_code: 200,
                message: "MTP unlinked successfully!",
                trace_id: traceId
            });
        }

    } catch (error: any) {
        if (transaction) {
            await transaction.rollback();
        }
        console.error(`Error during link/unlink:`, error);
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while processing MTP link/unlink",
            trace_id: traceId,
            error: error.message,
        });
    }
}


export async function linkMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    let transaction;
    
    try {
      const { program_id: programId, id } = request.params as { program_id: string, id: string };
      const { mtp_candidate_id: mtpCandidateId } = request.body as { mtp_candidate_id: string };
      
      const mtp = await MtpModel.findOne({
        where: { id, program_id: programId }
      });
      
      if (!mtp) {
        console.warn(`MTP not found for ID: ${id}`);
        return reply.status(404).send({
          status_code: 404,
          message: "MTP not found",
          trace_id: traceId
        });
      }
      
      const currentLinks = Array.isArray(mtp.linked_profiles) ? mtp.linked_profiles : [];
      console.log(`Current linked_profiles:`, currentLinks);
      
      transaction = await sequelize.transaction();
      
      if (!currentLinks.includes(mtpCandidateId)) {
        const updatedLinks = [...currentLinks, mtpCandidateId];
        
        await MtpModel.update(
          { linked_profiles: updatedLinks },
          { 
            where: { id, program_id: programId },
            transaction
          }
        );
        
        const deleteRes = await MtpModel.destroy({
          where: {
            mtp_candidate_id: mtpCandidateId,
            program_id: programId
          },
          transaction
        });
      }
      
      await transaction.commit();
      
      return reply.send({
        status_code: 200,
        message: "MTP linked successfully!",
        trace_id: traceId
      });
      
    } catch (error: any) {
      if (transaction) {
        await transaction.rollback();
      }
      return reply.status(500).send({
        status_code: 500,
        message: "An error occurred while linking MTP",
        trace_id: traceId,
        error: error.message,
      });
    }
  }

  export async function unlinkMtp(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    let transaction;
    
    try {
      const { program_id: programId, id } = request.params as { program_id: string, id: string };
      const { mtp_candidate_id: mtpCandidateId } = request.body as { mtp_candidate_id: string };
      const user = request.user;
      const userId = user?.sub;
      
      const mtp = await MtpModel.findOne({
        where: { id, program_id: programId }
      });
      
      if (!mtp) {
        return reply.status(404).send({
          status_code: 404,
          message: "MTP not found",
          trace_id: traceId
        });
      }
      
      const currentLinks = Array.isArray(mtp.linked_profiles) ? mtp.linked_profiles : [];
      
      transaction = await sequelize.transaction();
      
      if (!currentLinks.includes(mtpCandidateId)) {
        await transaction.rollback();
        return reply.status(400).send({
          status_code: 400,
          message: "Candidate ID not found in linked_profiles.",
          trace_id: traceId
        });
      }
      
      const updatedLinks = currentLinks.filter(id => id !== mtpCandidateId);      
      await MtpModel.update(
        { linked_profiles: updatedLinks },
        {
          where: { id, program_id: programId },
          transaction
        }
      );
      
      const getCandidateData = await mtpRepository.getCandidate(programId, mtpCandidateId);
      const talentName = getCandidateData?.[0]?.candidate_name;
      
       await MtpModel.create({
        mtp_candidate_id: mtpCandidateId,
        talent_name: talentName,
        program_id: programId,
        linked_profiles: [],
        created_by: userId,
        modified_by: userId,
      }, { transaction });
        await transaction.commit();
      
      return reply.send({
        status_code: 200,
        message: "MTP unlinked successfully!",
        trace_id: traceId
      });
      
    } catch (error: any) {
      if (transaction) {
        await transaction.rollback();
      }
      return reply.status(500).send({
        status_code: 500,
        message: "An error occurred while unlinking MTP",
        trace_id: traceId,
        error: error.message,
      });
    }
  }
  







