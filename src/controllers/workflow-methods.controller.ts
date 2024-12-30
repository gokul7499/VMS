import { FastifyRequest, FastifyReply } from 'fastify';
import WorkflowMethod from '../models/workflow-methods.model';
import { WorkflowMethodData } from '../interfaces/workflow-methods.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Module } from '../models/module.model';
import Event from '../models/event.model';

export const createWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const WorkflowMethodDataPayload = request.body as Omit<WorkflowMethodData, '_id'>;
    const trace_id = generateCustomUUID();

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
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
    const trace_id = generateCustomUUID();
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
        reply.status(500).send({ message: ' An Error Occurred While Updating The Workflow Method.', error, trace_id });
    }
}

export const deleteWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const trace_id = generateCustomUUID();

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
    const trace_id = generateCustomUUID();

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
    const trace_id = generateCustomUUID();
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
    const trace_id = generateCustomUUID();
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
    const trace_id = generateCustomUUID();
    try {
        const { module } = request.query as { module: string };
        let item;
        if (module === 'job') {
            const event_slug = "create_job";
            const module_name = "Job";
            let moduleId;
            if (module_name) {
                moduleId = await Module.findOne({ where: { name: module_name } })
            }
            const module_ids = moduleId?.dataValues.id || "";
            let eventId;
            if (module_ids && event_slug) {
                eventId = await Event.findOne({ where: { module_id: module_ids, slug: event_slug, is_enabled: true } })
            }
            item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    event_id: eventId?.id
                }
            });
        } else if (module === 'offer') {
            const event_slug = "create_offer";
            const module_name = "Offers";
            let moduleId;
            if (module_name) {
                moduleId = await Module.findOne({ where: { name: module_name } })
            }
            const module_ids = moduleId?.dataValues.id || "";
            let eventId;
            if (module_ids && event_slug) {
                eventId = await Event.findOne({ where: { module_id: module_ids, slug: event_slug, is_enabled: true } })
            }
            item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    event_id: eventId?.id

                }
            });
        } else if (module === 'assignment') {
            const event_slug = "create_assignment";
            const module_name = "Assignment";
            let moduleId;
            if (module_name) {
                moduleId = await Module.findOne({ where: { name: module_name } })
            }
            const module_ids = moduleId?.dataValues.id || "";
            let eventId;
            if (module_ids && event_slug) {
                eventId = await Event.findOne({ where: { module_id: module_ids, slug: event_slug, is_enabled: true } })
            }
            item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    event_id: eventId?.id

                }
            });
        } else if (module === 'submit_candidate_rehire_check') {
            const event_slug1 = "submit_candidate_rehire_check";
            const event_slug2 = "submit_candidate_shortlist";
            const module_name = "Submissions";
            let moduleId
            if (module_name) {
                moduleId = await Module.findOne({ where: { name: module_name } })
            }
            const module_ids = moduleId?.dataValues.id || "";
            let eventId1Value: any;
            let eventId2Value: any;
            if (module_ids && event_slug1) {
                eventId1Value = await Event.findOne({ where: { module_id: module_ids, slug: event_slug1, is_enabled: true } })
            }
            if (module_ids && event_slug2) {
                eventId2Value = await Event.findOne({ where: { module_id: module_ids, slug: event_slug2, is_enabled: true } })
            }
            let eventId1 = eventId1Value?.dataValues?.id || null;
            let eventId2 = eventId2Value?.dataValues?.id || null;

            item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    [Op.or]: [
                        { event_id: eventId1 },
                        { event_id: eventId2 },
                    ]
                }
            });

            const reviewMethod1 = item.find(
                i => i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() === "review"
            );

            const reviewMethod2 = item.find(
                i => i.dataValues.event_id === eventId2 &&
                    i.dataValues.name?.trim().toLowerCase() === "review"
            );

            const approvalMethod = item.find(
                i => i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() === "approval"
            );

            if (reviewMethod1 && reviewMethod2 && approvalMethod) {
                const updatedItems = item.map(i =>
                    i.id === reviewMethod1.id
                        ? { ...i.dataValues, shortlist_method_id: reviewMethod2.id }
                        : i.dataValues
                ).filter(i => i.id !== reviewMethod2.id);

                return reply.status(200).send({
                    statusCode: 200,
                    workflow_method: updatedItems,
                    trace_id
                });
            }
        } else if (module === 'submit_candidate_shortlist') {
            const event_slug = "submit_candidate_shortlist";
            const module_name = "Submissions";
            let moduleId
            if (module_name) {
                moduleId = await Module.findOne({ where: { name: module_name } })
            }
            const module_ids = moduleId?.dataValues.id || "";
            let eventId
            if (module_ids && event_slug) {
                eventId = await Event.findOne({ where: { module_id: module_ids, slug: event_slug, is_enabled: true } })
            }
            item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    event_id: eventId?.id

                }
            });
        } else if (module === 'candidate') {
            const event_slug = "locum_name_clear";
            const module_name = "Candidates";
            let moduleId
            if (module_name) {
                moduleId = await Module.findOne({ where: { name: module_name } })
            }
            const module_ids = moduleId?.dataValues.id || "";
            let eventId
            if (module_ids && event_slug) {
                eventId = await Event.findOne({ where: { module_id: module_ids, slug: event_slug, is_enabled: true } })
            }
            item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    event_id: eventId?.id

                }
            });
        } else {
            item = null;
        }

        if (item && item.length > 0) {
            const reviewItem = item.find(it =>
                it.dataValues.name?.trim().toLowerCase() === "review"
            );
            const otherItems = item.filter(it =>
                it.dataValues.name?.trim().toLowerCase() !== "review"
            );

            const sortedItems = reviewItem ? [reviewItem, ...otherItems] : otherItems;

            reply.status(200).send({
                statusCode: 200,
                workflow_method: sortedItems,
                trace_id
            });
        } else {
            reply.status(404).send({
                statusCode: 404,
                message: 'Workflow Method Data Not Found',
                workflow_method: [],
                trace_id
            });
        }
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'An Error Occurred While Fetching Workflow Method.',
            error,
            trace_id
        });
    }
}