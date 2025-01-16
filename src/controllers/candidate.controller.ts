import { FastifyRequest, FastifyReply } from "fastify";
import candidateModel from "../models/candidate.model";
import candidateInterface from "../interfaces/candidate.Interface"
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import countriesModel from "../models/countries.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { ProgramVendor } from "../models/program-vendor.model";
import { Op } from "sequelize";
import { generateCandidateCode } from "../utility/code-genrate-service";
import { fetchUnavailableCandidates } from "../utility/submission-candidate";

export async function createCandidate(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const candidate = request.body as candidateInterface;
    const { program_id, email } = candidate;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    const userId = user?.sub;

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    try {
        if (email) {
            const existingCandidate = await candidateModel.findOne({
                where: {
                    program_id,
                    email,
                    is_deleted: false
                }
            });

            if (existingCandidate) {
                return reply.status(200).send({
                    status_code: 200,
                    message: "Candidate with the same email already exists in this program",
                    candidate: {},
                    trace_id: traceId,
                });
            }
        }

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating candidate",
                status: "success",
                description: `Creating candidate for ${program_id}`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            candidateModel
        );

        const candidateId = await generateCandidateCode(program_id);

        const [candidateData]: any = await candidateModel.upsert({
            ...candidate,
            candidate_id: candidateId,
            created_by: userId,
            modified_by: userId,
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create candidate",
                status: "success",
                description: `Create candidate for ${program_id} successfully: ${candidateData.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            candidateModel
        );

        return reply.status(201).send({
            status_code: 201,
            message: "Candidate Created Successfully",
            candidate: candidateData?.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create candidate",
                status: "error",
                description: `error to create candidate for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            candidateModel
        );

        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Failed To Create Candidate",
            error: (error as Error).message,
        });
    }
}

export async function getAllCandidate(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            page = "1",
            limit = "10",
            sort = "desc",
            candidate_id,
            vendor_id,
            first_name,
            middle_name,
            last_name,
            name,
            title,
            is_active,
            worker_type_id,
            availability_date,
            unique_id,
            country_name,
            vendor_name,
            updatedAt,
            available_candidate,
            job_id,
            ...filters
        } = request.query as any;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        let order: [string, string][] = [["createdAt", "DESC"]];

        if (sort === "asc") {
            order = [["createdAt", "ASC"]];
        } else if (sort === "desc") {
            order = [["createdAt", "DESC"]];
        }

        const whereClause: any = {
            program_id,
            is_deleted: false,
            ...filters
        };

        if (candidate_id) whereClause.candidate_id = candidate_id;
        if (vendor_id) whereClause.vendor_id = vendor_id;
        if (first_name) whereClause.first_name = { [Op.like]: `%${first_name}%` };
        if (name) whereClause.name = { [Op.like]: `%${name}%` };
        if (middle_name) whereClause.middle_name = { [Op.like]: `%${middle_name}%` };
        if (last_name) whereClause.last_name = { [Op.like]: `%${last_name}%` };
        if (title) whereClause.title = { [Op.like]: `%${title}%` };
        if (is_active !== undefined) whereClause.is_active = is_active === 'true';
        if (worker_type_id) whereClause.worker_type_id = worker_type_id;
        if (availability_date) whereClause["preferences.availability_date"] = availability_date;
        if (updatedAt) whereClause.updatedAt = updatedAt;
        if (available_candidate === "true" && job_id) {
            try {
                const unavailableCandidateIds = await fetchUnavailableCandidates(
                    program_id,
                    job_id,
                    traceId
                );
                whereClause.id = { [Op.notIn]: unavailableCandidateIds };
            } catch (error: any) {
                return reply.status(500).send({
                    status_code: 500,
                    trace_id: traceId,
                    message: "Error fetching unavailable candidates from sourcing service",
                    error: error.message,
                });
            }
        }
        const includeClause = [
            {
                model: ProgramVendor,
                as: 'vendor',
                attributes: ['id', 'vendor_name'],
                where: vendor_name ? { vendor_name: { [Op.like]: `%${vendor_name}%` } } : undefined
            }
        ];

        const candidates = await candidateModel.findAll({
            where: whereClause,
            attributes: [
                'id', 'first_name', 'middle_name', 'last_name', 'is_active', 'name', 'email',
                'candidate_id', 'preferences', 'worker_type_id', 'title', 'birth_date', 'modified_on',"state_national_id","do_not_rehire_notes","do_not_rehire_reason","do_not_rehire"
            ],
            limit: limitNum,
            offset,
            order,
            include: includeClause
        });

        const formattedCandidates = candidates.map((cand: any) => {
            return {
                id: cand.id,
                first_name: cand.first_name,
                middle_name: cand.middle_name,
                last_name: cand.last_name,
                name: cand.name,
                birth_date: cand.birth_date,
                is_active: cand.is_active,
                candidate_id: cand.candidate_id,
                preferences: cand.preferences,
                worker_type_id: cand.worker_type_id,
                title: cand.title,
                email: cand.email,
                vendor: cand.vendor ? {
                    id: cand.vendor.id,
                    vendor_name: cand.vendor.vendor_name
                } : null,
                modified_on: cand.modified_on,
                state_national_id:cand.state_national_id,
                do_not_rehire_notes:cand.do_not_rehire_notes,
                do_not_rehire_reason:cand.do_not_rehire,
                do_not_rehire:cand.do_not_rehire
            };
        });

        const count = await candidateModel.count({
            where: whereClause,
            include: includeClause
        });

        return reply.status(200).send({
            status_code: 200,
            message: "Candidate get successfully",
            items_per_page: limitNum,
            total_candidates: count,
            candidates: formattedCandidates,
            trace_id: traceId,
        });

    } catch (error) {
        console.error("Error fetching candidates:", error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}

export async function getCandidateByIdAndProgramId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string, id: string; };
        const candidate = await candidateModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false
            },
            attributes: {
                exclude: ['country_id', 'vendor_id']
            },
            include: [
                {
                    model: ProgramVendor,
                    as: 'vendor',
                    attributes: ['id', 'vendor_name'],
                },
                {
                    model: countriesModel,
                    as: 'country',
                    attributes: ['id', 'name', 'isd_code', 'iso_code_2', 'iso_code_3', 'min_phone_length', 'max_phone_length'],
                }
            ]
        });
        if (!candidate) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: "Candidate feteched succssfully!",
            });
        }
        return reply.status(200).send({
            status_code: 200,
            message: "Candidate not found",
            candidate,
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error fetching candidate:", error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
        });
    }
}

export async function updateCandidateByIdAndProgramId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id, } = request.params as { program_id: string, id: string; };
        const updates = request.body as candidateInterface;
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;

        const [updatedRows] = await candidateModel.update({...updates,modified_by:userId}, {
            where: {
                program_id,
                id,
                is_deleted: false
            }
        });
        if (updatedRows === 0) {
            return reply.status(404).send({
                status_code: 404,
                trace_id: traceId,
                message: "Candidate not found",
            });
        }
        const updatedRecord = await candidateModel.findOne({
            where: {
                program_id,
                id,
                is_deleted: false
            }
        });
        return reply.status(200).send({
            status_code: 200,
            message: "Candidate update successfully",
            record: updatedRecord,
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating candidate:", error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
        });
    }
}

export async function deleteCandidateByIdAndProgramId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };

        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code:401,message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;
       
        const [updatedRows] = await candidateModel.update(
            { is_deleted: true,
              modified_by: userId,},
            {
                where: {
                    id,
                    program_id
                }
            }
        );
        if (updatedRows === 0) {
            return reply.status(404).send({
                status_code: 404,
                trace_id: traceId,
                message: "Candidate not found or already deleted",
            });
        }
        return reply.status(200).send({
            status_code: 200,
            message: "Candidate successfully deleted",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error deleting candidate:", error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
        });
    }
}

export async function candidateSearch(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['first_name', 'primary_email'];
    const responseFields = ['first_name', 'primary_email'];
    return baseSearch(request, reply, candidateModel, searchFields, responseFields);
}