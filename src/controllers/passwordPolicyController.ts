import passwordPolicyModel from "../models/passwordPolicyModel";
import { FastifyRequest, FastifyReply } from "fastify";
import { passwordPolicyData } from "../interfaces/passwordPolicyInterface";
import { baseSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId";

export async function getPasswordPolicy(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id'];
    const responseFields = ['id', 'program_id', 'expire_in', 'retained', 'must_contain', 'min_length', 'max_log_attempt', 'is_enabled'];
    return baseSearch(request, reply, passwordPolicyModel, searchFields, responseFields);
}

export async function getPasswordPolicyById(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params;
        const password_policy = await passwordPolicyModel.findOne({ where: { program_id, id } });
        if (password_policy) {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy fetch Successfully.',
                trace_id: generateCustomUUID(),
                password_policy: password_policy
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy not found.',
                password_policy: []
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'An error occurred while fetching PasswordPolicy.',
            trace_id: generateCustomUUID(),
            error: error,
        });
    }
}

export const createPasswordPolicy = async (request: FastifyRequest, reply: FastifyReply) => {
    const password_policy = request.body as passwordPolicyData;
    try {
        await passwordPolicyModel.create({ ...password_policy });
        reply.status(201).send({
            status_code: 201,
            trace_id: generateCustomUUID(),
            message: 'PasswordPolicy Created Successfully.',
        });

    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating PasswordPolicy.',
            trace_id: generateCustomUUID(),
            error: (error as Error).message,
        });
    }
}

export async function updatePasswordPolicy(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const { id } = request.params;
    try {
        const [updatedCount] = await passwordPolicyModel.update(request.body as passwordPolicyData, { where: { id } });
        if (updatedCount > 0) {
            reply.send({
                status_code: 201,
                message: 'PasswordPolicy updated successfully.',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'Internal Server error',
            trace_id: generateCustomUUID(),
            error
        });
    }
}

export async function deletePasswordPolicy(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    try {
        const { program_id, id } = request.params;
        const passwordPolicyData = await passwordPolicyModel.findOne({ where: { program_id, id } });
        if (passwordPolicyData) {
            await passwordPolicyModel.update({ is_deleted: true, is_enabled: false }, { where: { program_id, id } });
            reply.status(204).send({
                status_code: 204,
                message: 'PasswordPolicy deleted successfully.',
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'PasswordPolicy not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            message: 'Internal Server error',
            trace_id: generateCustomUUID(),
            error
        });
    }
}
