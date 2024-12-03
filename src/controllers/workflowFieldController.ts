import { FastifyRequest, FastifyReply } from 'fastify';
import WorkflowField from '../models/workflowFieldModel';
import {WorkflowFieldData} from '../interfaces/workflowFieldInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createWorkflowField = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const WorkflowFieldPayload = request.body as Omit<WorkflowFieldData, '_id'>;
        const WorkflowFieldData: any = await WorkflowField.create({ ...WorkflowFieldPayload });
        reply.status(201).send({
            status_code: 201,
            id: WorkflowFieldData?.id,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error while creating workflow field.',
            error: error,
            trace_id:traceId,
        });
    }
};

export const updateWorkflowField = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const WorkflowFieldData = request.body as WorkflowFieldData;
    const traceId=generateCustomUUID();
    try {
        const data = await WorkflowField.findOne({
            where: { id, is_deleted: false },
        });
        if (!data) {
            return reply.status(200).send({ message: 'Workflow field not found.',trace_id:traceId});
        }
        const UpdatedWorkflowInstance = await data.update(WorkflowFieldData);

        if (UpdatedWorkflowInstance) {
            reply.send({ success: true, message: 'Workflow field updated successfully.',trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An error occurred while updating the workflow config', error, trace_id:traceId});
    }
}

export const deleteWorkflowField= async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const data = await WorkflowField.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'Workflow field not found.',trace_id:traceId });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            id: id,
            trace_id:traceId,
            message: 'Workflow field config deleted successfully!'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error deleting workflow field', error, trace_id:traceId });
    }
}

export async function getAllWorkflowField(
    request: FastifyRequest<{ Params: WorkflowFieldData, Querystring: WorkflowFieldData }>,
    reply: FastifyReply
) {
  const traceId=generateCustomUUID();
    try {
        const params = request.params as WorkflowFieldData;
        const query = request.query as WorkflowFieldData | any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        
        const { rows: workflowInstance, count } = await WorkflowField.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false},
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (workflowInstance.length === 0) {
            return reply.status(200).send({
                message: "Workflow field not found",
                traceId:traceId,
                field: []
            });
        }

        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            field: workflowInstance,
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: "Internal server error",
            error: error,
            trace_id:traceId,
        });
    }
}

export async function getWorkflowFieldById(request: FastifyRequest, reply: FastifyReply) {
  const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string }
        const item = await WorkflowField.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                field: item,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({ message: 'Workflow field not found',trace_id:traceId, field_config: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An error occurred while fetching workflow instance',trace_id:traceId, error });
    }
}
