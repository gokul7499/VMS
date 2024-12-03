import { FastifyRequest, FastifyReply } from 'fastify';
import WorkFlowInstanceLogModel from '../models/workflowInstanceLogModel';
import { WorkflowInstanceLogData } from '../interfaces/workflowInstanceLogInterface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createWorkflowInstanceLog = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { program_id } = request.params as { program_id: string };
        const workFlowInstanceLogPayload = request.body as Omit<WorkflowInstanceLogData, '_id'>;
        const WorkflowInstanceLogData: any = await WorkFlowInstanceLogModel.create({ ...workFlowInstanceLogPayload, program_id });
        reply.status(201).send({
            status_code: 201,
            workflow_instance_log_id: WorkflowInstanceLogData?.id,
            trace_id: generateCustomUUID(),
        });
    } catch (error) {
        reply.status(500).send({
            message: 'Error While Creating Workflow Instance Log.',
            error: error,
            trace_id: generateCustomUUID(),
        });
    }
};

export const updateWorkflowInstanceLog = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const WorkflowInstanceLogData = request.body as WorkflowInstanceLogData;
    try {
        const data = await WorkFlowInstanceLogModel.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!data) {
            return reply.status(200).send({ message: 'Workflow Instance Log Not Found.' });
        }
        const UpdatedworkFlowInstanceLog = await data.update(WorkflowInstanceLogData);

        if (UpdatedworkFlowInstanceLog) {
            reply.send({ success: true, message: 'Workflow Instance Log Updated Successfully.' });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Updating The Workflow Instance Log', error, trace_id: generateCustomUUID() });
    }
}

export const deleteWorkflowInstanceLog = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = await WorkFlowInstanceLogModel.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'Workflow Instance Log Data Not Found' });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            workflow_instance_log_id: id,
            trace_id: generateCustomUUID(),
            message: 'Workflow Instance Log Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error Deleting Workflow Instance Log', error, trace_id: generateCustomUUID() });
    }
}

export async function getAllWorkflowInstanceLog(
    request: FastifyRequest<{ Params: WorkflowInstanceLogData, Querystring: WorkflowInstanceLogData }>,
    reply: FastifyReply
) {
    try {
        const params = request.params as WorkflowInstanceLogData;
        const query = request.query as WorkflowInstanceLogData | any;

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

        const { rows: workFlowInstanceLog, count } = await WorkFlowInstanceLogModel.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false, program_id: params.program_id },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (workFlowInstanceLog.length === 0) {
            return reply.status(200).send({
                message: "Workflow Instance Log Not Found",
                workFlowInstanceLog: []
            });
        }

        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            workFlowInstanceLog: workFlowInstanceLog,
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

export async function getWorkflowInstanceLogById(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id, program_id } = request.params as { id: string, program_id: string }
        const item = await WorkFlowInstanceLogModel.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                workFlowInstanceLog: item,
                trace_id: generateCustomUUID(),
            });
        } else {
            reply.status(200).send({ message: 'Workflow Instance Log Not Found', workFlowInstanceLog: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching Workflow Instance Log', error });
    }
}
