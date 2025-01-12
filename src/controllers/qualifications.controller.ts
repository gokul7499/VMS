import { FastifyRequest, FastifyReply } from 'fastify';
import Qualifications from '../models/qualifications.model';
import { QualificationData } from '../interfaces/qualifications.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import qualificationTypeModel from '../models/qualification-type-model';
import { generateQualificationCode } from '../plugins/qualificationCodeGenerate';

export const createQualification = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { name } = request.body as QualificationData;
        const existingQualification = await Qualifications.findOne({
            where: { name, program_id },
        });

        if (existingQualification) {
            return reply.status(409).send({
                status_code: 409,
                message: 'Qualification With The Same Name Already Exists.',
                trace_id: traceId,
            });
        }

        const QualificationsDataPayload = request.body as Omit<QualificationData, '_id'>;
        const QualificationsData: any = await Qualifications.create({ ...QualificationsDataPayload, program_id });
        reply.status(201).send({
            status_code: 201,
            message: 'Qualification Created Successfully.',
            Qualifications: {
                id: QualificationsData?.id,
                name: QualificationsData?.name,
            },
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({ status_code:200,message: 'Error While Creating Qualification', error, trace_id: traceId });
    }
};

export async function bulkCreateQualifications(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const qualificationsDataPayload: QualificationData[] = request.body as QualificationData[];
        const { program_id } = request.params as { program_id: string };

        if (!Array.isArray(qualificationsDataPayload)) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Invalid Payload Data',
                trace_id: traceId
            });
        }

        const createdQualifications = [];
        for (const item of qualificationsDataPayload) {
            const { qualification_type_id, title } = item;
            const code = await generateQualificationCode(qualification_type_id, title);
            const newQualification = await Qualifications.create({
                ...item,
                program_id,
                code
            });
            createdQualifications.push(newQualification);
        }

        reply.status(201).send({
            status_code: 201,
            message: "Successfully Created Qualifications",
            qualifications: createdQualifications,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 200,
            message: 'Error While Creating Qualifications',
            error: error,
            trace_id: traceId
        });
    }
}

export async function getQualificationCode(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const { qualification_type_id, title } = request.query as { qualification_type_id: string, title: string };
        const code = await generateQualificationCode(qualification_type_id, title);
        if (code) {
            reply.status(200).send({
                status_code: 200,
                message: "Qualification Code Generated Successfully",
                qualification_code: code,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Qualification Type Not Found', Qualification: [] ,trace_id:traceId});
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'An Error Occurred While Generating Code', error ,trace_id:traceId});
    }
}

export const updateQualification = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const QualificationsData = request.body as QualificationData;
    const traceId=generateCustomUUID();
    try {
        const data = await Qualifications.findOne({
            where: {
                id, program_id, is_deleted: false
            }
        });
        if (data) {
            await data.update(QualificationsData);
            reply.status(201).send({
                status_code: 201,
                Qualification_id: id,
                trace_id: traceId,
                message: 'Qualification Data Updated Successfully.',
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Qualification Not Found.',trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code:500,message: ' An Error Occurred While Updating The Qualification', error, trace_id: traceId });
    }
}

export const deleteQualification = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = await Qualifications.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({status_code:200, message: 'Qualification Not Found',trace_id:traceId });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            Qualifications_id: id,
            trace_id: traceId,
            message: 'Qualification Data Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'Error Deleting Qualification', error, trace_id: traceId});
    }
}

export async function getAllQualifications(
    request: FastifyRequest<{ Params: QualificationData, Querystring: QualificationData }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const params = request.params as Partial<QualificationData>;
        const query = request.query as any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};

        if (query.type) {
            searchConditions.type = query.type;
        } else {
            if (query.name) {
                searchConditions.name = { [Op.like]: `%${query.name}%` };
            }
            if (query.is_enabled !== undefined) {
                searchConditions.is_enabled = query.is_enabled !== "false";
            }
            if (query.code) {
                searchConditions.code = query.code;
            }
            if (query.qualification_type_id) {
                searchConditions.qualification_type_id = query.qualification_type_id;
            }
            searchConditions.program_id = params.program_id;
        }

        const { rows: qualification, count } = await Qualifications.findAndCountAll({
            where: { ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (qualification.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Qualification Not Found",
                qualification: [],
                trace_id:traceId
            });
        }

        let qualificationTypeName = null;
        if (query.qualification_type_id) {
            const qualificationType = await qualificationTypeModel.findOne({
                where: { id: query.qualification_type_id },
                attributes: ['name'],
            });

            if (qualificationType) {
                qualificationTypeName = qualificationType.name;
            }
        }

        reply.status(200).send({
            status_code: 200,
            message: "Qualification Found",
            qualification_type_name: qualificationTypeName,
            items_per_page: limit,
            total_records: count,
            qualifications: qualification,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getQualificationById(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await Qualifications.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "Qualification Found",
                qualification: item,
                trace_id: traceId
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Qualification Not Found', Qualifications: [],trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'An Error Occurred While Fetching Qualification', error ,trace_id:traceId});
    }
}
