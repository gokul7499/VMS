import { FastifyRequest, FastifyReply } from 'fastify';
import WorkFlowApproverModel from '../models/workflowApproversModel';
import { WorkflowApproversData } from '../interfaces/workflowApproversInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createWorkflowApprover = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id } = request.params as { program_id: string };
        const workflowApproverPayload = request.body as Omit<WorkflowApproversData, '_id'>;
        const WorkflowApproversData: any = await WorkFlowApproverModel.create({ ...workflowApproverPayload, program_id });
        reply.status(201).send({
            status_code: 201,
            workflow_approver_id: WorkflowApproversData?.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error While Creating Workflow Approver.',
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
};

export const updateWorkflowApprover = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const WorkflowApproversData = request.body as WorkflowApproversData;
    try {
        const data = await WorkFlowApproverModel.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!data) {
            return reply.status(200).send({ message: 'Workflow Approver Not Found.' });
        }
        const UpdatedWorkflowApprover = await data.update(WorkflowApproversData);

        if (UpdatedWorkflowApprover) {
            reply.send({ success: true, message: 'Workflow Approver Updated Successfully.' });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Updating The Workflow Approver', error, trace_id: generateCustomUUID() });
    }
}

export const deleteWorkflowApprover = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = await WorkFlowApproverModel.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'Workflow Approver Data Not Found' });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            workflow_approver_id: id,
            trace_id: generateCustomUUID(),
            message: 'Workflow Approver Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error Deleting Workflow Approver', error, trace_id: generateCustomUUID() });
    }
}

export async function getAllWorkflowApprover(
    request: FastifyRequest<{ Params: WorkflowApproversData, Querystring: WorkflowApproversData }>,
    reply: FastifyReply
) {
    try {
        const params = request.params as WorkflowApproversData;
        const query = request.query as WorkflowApproversData | any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        if (query.is_enabled) {
            searchConditions.is_enabled = query.is_enabled;
        }
        if (query.module_id) {
            searchConditions.module_id = query.module_id;
        }
        if (query.event_id) {
            searchConditions.event_id = query.event_id;
        }
        if (query.method_id) {
            searchConditions.method_id = query.method_id;
        }
        if (query.workflow_id) {
            searchConditions.workflow_id = query.workflow_id;
        }

        const { rows: workflowApprover, count } = await WorkFlowApproverModel.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false, program_id: params.program_id },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (workflowApprover.length === 0) {
            return reply.status(200).send({
                message: "Workflow Approver Not Found",
                workflowApprover: []
            });
        }

        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            workflowApprover: workflowApprover,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
}

export async function getWorkflowApproverById(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string }
        const item = await WorkFlowApproverModel.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                workflowApprover: item,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'Workflow Approver Not Found', workflowApprover: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching Workflow Approver', error });
    }
}
