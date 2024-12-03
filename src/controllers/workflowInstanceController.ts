import { FastifyRequest, FastifyReply } from 'fastify';
import WorkFlowInstanceModel from '../models/workflowInstanceModel';
import { WorkflowInstanceData } from '../interfaces/workflowInstanceInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createWorkflowInstance = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id } = request.params as { program_id: string };
        const workflowInstancePayload = request.body as Omit<WorkflowInstanceData, '_id'>;
        const WorkflowInstanceData: any = await WorkFlowInstanceModel.create({ ...workflowInstancePayload, program_id });
        reply.status(201).send({
            status_code: 201,
            workflow_instance_id: WorkflowInstanceData?.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error While Creating Workflow instance.',
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
};

export const updateWorkflowInstance = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const WorkflowInstanceData = request.body as WorkflowInstanceData;
    try {
        const data = await WorkFlowInstanceModel.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!data) {
            return reply.status(200).send({ message: 'Workflow Instance Not Found.' });
        }
        const UpdatedWorkflowInstance = await data.update(WorkflowInstanceData);

        if (UpdatedWorkflowInstance) {
            reply.send({ success: true, message: 'Workflow Instance Updated Successfully.' });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Updating The Workflow Instance', error, trace_id: generateCustomUUID() });
    }
}

export const deleteWorkflowInstance = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = await WorkFlowInstanceModel.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'Workflow Instance Data Not Found' });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            workflow_instance_id: id,
            trace_id: generateCustomUUID(),
            message: 'Workflow Instance Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error Deleting Workflow Instance', error, trace_id: generateCustomUUID() });
    }
}

export async function getAllWorkflowInstance(
    request: FastifyRequest<{ Params: WorkflowInstanceData, Querystring: WorkflowInstanceData }>,
    reply: FastifyReply
) {
    try {
        const params = request.params as WorkflowInstanceData;
        const query = request.query as WorkflowInstanceData | any;

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

        const { rows: workflowInstance, count } = await WorkFlowInstanceModel.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false, program_id: params.program_id },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (workflowInstance.length === 0) {
            return reply.status(200).send({
                message: "Workflow Instance Not Found",
                workflowInstance: []
            });
        }

        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            workflowInstance: workflowInstance,
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

export async function getWorkflowInstanceById(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string }
        const item = await WorkFlowInstanceModel.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                workflowInstance: item,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'Workflow Instance Not Found', workflowInstance: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching Workflow Instance', error });
    }
}
