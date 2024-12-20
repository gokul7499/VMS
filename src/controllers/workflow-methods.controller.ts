import { FastifyRequest, FastifyReply } from 'fastify';
import WorkflowMethod from '../models/workflow-methods.model';
import { WorkflowMethodData } from '../interfaces/workflow-methods.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';

export const createWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const WorkflowMethodDataPayload = request.body as Omit<WorkflowMethodData, '_id'>;
    const trace_id = generateCustomUUID();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }

    logger(
        {
            trace_id,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating workflow method",
            status: "success",
            level: 'info',
            action: request.method,
            url: request.url,
            is_deleted: false
        },
        WorkflowMethod
    );

    try {
        const WorkflowMethodData: any = await WorkflowMethod.create({ ...WorkflowMethodDataPayload });
        reply.status(201).send({
            status_code: 201,
            workflow_method: {
                id: WorkflowMethodData?.id,
                name: WorkflowMethodData?.name,
            },
            trace_id
        });

        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created workflow method",
                status: "success",
                description: `Created workflow method successfully: ${WorkflowMethodData?.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            WorkflowMethod
        );
    } catch (error) {
        logger(
            {
                trace_id,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created workflow method",
                status: "error",
                description: `Error creating workflow method.`,
                level: 'error',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            WorkflowMethod
        );

        reply.status(500).send({ message: 'Error While Creating Workflow Method.', error, trace_id });
    }
};

export const updateWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const WorkflowMethodData = request.body as WorkflowMethodData;
    const trace_id=generateCustomUUID();
    try {
        const data = await WorkflowMethod.findOne({
            where: { id, is_deleted: false }
        });
        if (data) {
            await data.update(WorkflowMethodData);
            reply.status(201).send({
                status_code: 201,
                workflow_method_id: id,
                trace_id,
                message: 'Workflow Method Updated Successfully.',
            });
        } else {
            reply.status(200).send({ message: 'Workflow Method Data Not Found.' });
        }
    } catch (error) {
        reply.status(500).send({ message: ' An Error Occurred While Updating The Workflow Method.', error ,trace_id});
    }
}

export const deleteWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id=generateCustomUUID();

    try {
        const { id, } = request.params as { id: string };
        const data = await WorkflowMethod.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ message: 'Workflow Method Data Not Found' });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            Workflow_method_id: id,
            trace_id,
            message: 'Workflow Method Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ message: 'Error Deleting Workflow Method Data', error, trace_id });
    }
}

export async function getAllWorkflowMethods(
    request: FastifyRequest<{ Params: WorkflowMethodData, Querystring: WorkflowMethodData }>,
    reply: FastifyReply
) {
    const trace_id=generateCustomUUID();

    try {
        const query = request.query as WorkflowMethodData | any;

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
        const { rows: workflow_method, count } = await WorkflowMethod.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (workflow_method.length === 0) {
            return reply.status(200).send({
                message: "Workflow Method Not Found",
                workflow: []
            });
        }
        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            workflow_method: workflow_method,
            trace_id,
        });
    } catch (error) {
        console.log(error);

        reply.status(500).send({
            statusCode: 500,
            message: "Internal Server Error",
            error: error,
            trace_id,
        });
    }
}

export async function getWorkflowMethods(
    request: FastifyRequest<{ Params: WorkflowMethodData, Querystring: WorkflowMethodData }>,
    reply: FastifyReply
) {
    const trace_id=generateCustomUUID();
    try {
        const query = request.query as WorkflowMethodData | any;

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
        const { rows: workflow_method, count } = await WorkflowMethod.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["name", "ASC"]],
            offset: offset,
        });
        if (workflow_method.length === 0) {
            return reply.status(200).send({
                message: "Workflow Method Not Found",
                workflow: []
            });
        }
        reply.status(200).send({
            statusCode: 200,
            items_per_page: limit,
            total_records: count,
            workflow_method: workflow_method,
            trace_id,
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: "Internal Server Error",
            error: error,
            trace_id,
        });
    }
}

export async function getWorkflowMethodById(request: FastifyRequest, reply: FastifyReply) {
    const trace_id=generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await WorkflowMethod.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                workflow_method: item,
                trace_id,
            });
        } else {
            reply.status(200).send({ message: 'Workflow Method Data Not Found', workflow: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching Workflow Method Data.', error });
    }
}

export async function getWorkflowMethod(request: FastifyRequest, reply: FastifyReply) {
    const trace_id=generateCustomUUID();
    try {
        const { module } = request.query as { module: string };
        let item;
        if (module === 'job') {
            item = await WorkflowMethod.findAll({
                where: { module_id: "1711799f-710f-4cad-b464-086265bad8ff", event_id: "bfb880d7-cd0f-4871-b0e1-b260754ce9f8" }
            })
        } else {
            item = await WorkflowMethod.findAll({
                where: { module_id: "1eceb989-3edc-4db2-9224-f00cddc4b5ea", event_id: "f652903c-3608-453b-bb0c-1d91c39b13f7" }
            });
        }
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                workflow_method: item,
                trace_id,
            });
        } else {
            reply.status(200).send({ message: 'Workflow Method Data Not Found', workflow: [] });
        }
    } catch (error) {
        reply.status(500).send({ message: 'An Error Occurred While Fetching Workflow Method Data.', error });
    }
}