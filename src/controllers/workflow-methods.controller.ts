import { FastifyRequest, FastifyReply } from 'fastify';
import WorkflowMethod from '../models/workflow-methods.model';
import { WorkflowMethodData } from '../interfaces/workflow-methods.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Module } from '../models/module.model';
import Event from '../models/event.model';
import Workflow from '../models/workflow.model';
import JobWorkFlowModel from '../models/job-workflow.model';

export const createWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const WorkflowMethodDataPayload = request.body as Omit<WorkflowMethodData, '_id'>;
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    logger(
        {
            trace_id: traceId,
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
            message: 'Workflow Method created successfully',
            workflow_method: {
                id: WorkflowMethodData?.id,
                name: WorkflowMethodData?.name,
            },
            trace_id: traceId
        });

        logger(
            {
                trace_id: traceId,
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
                trace_id: traceId,
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

        reply.status(500).send({ status_code: 500, message: 'Error While Creating Workflow Method.', error, trace_id: traceId });
    }
};

export const updateWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const WorkflowMethodData = request.body as WorkflowMethodData;
    const traceId = generateCustomUUID();
    try {
        const data = await WorkflowMethod.findOne({
            where: { id, is_deleted: false }
        });
        if (data) {
            await data.update(WorkflowMethodData);
            reply.status(201).send({
                status_code: 201,
                workflow_method_id: id,
                trace_id: traceId,
                message: 'Workflow Method Updated Successfully.',
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Workflow Method Data Not Found.', trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: ' An Error Occurred While Updating The Workflow Method.', error, trace_id: traceId });
    }
}

export const deleteWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();

    try {
        const { id, } = request.params as { id: string };
        const data = await WorkflowMethod.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ status_code: 200, message: 'Workflow Method Data Not Found' });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            Workflow_method_id: id,
            trace_id: traceId,
            message: 'Workflow Method Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Error Deleting Workflow Method Data', error, trace_id: traceId });
    }
}

export async function getAllWorkflowMethods(
    request: FastifyRequest<{ Params: WorkflowMethodData, Querystring: WorkflowMethodData }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();

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
                status_code: 200,
                message: "Workflow Method Not Found",
                workflow: [],
                trace_id: traceId
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "Workflow Method Retrieved Successfully",
            items_per_page: limit,
            total_records: count,
            workflow_method: workflow_method,
            trace_id: traceId,
        });
    } catch (error) {
        console.log(error);

        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getWorkflowMethods(
    request: FastifyRequest<{ Params: WorkflowMethodData, Querystring: WorkflowMethodData }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
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
                status_code: 200,
                message: "Workflow Method Not Found",
                workflow: [],
                trace_id: traceId,
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "Workflow Method Found",
            items_per_page: limit,
            total_records: count,
            workflow_method: workflow_method,
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

export async function getWorkflowMethodById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await WorkflowMethod.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "Workflow Method Found",
                workflow_method: item,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Workflow Method Data Not Found', workflow: [], trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'An Error Occurred While Fetching Workflow Method Data.', error, trace_id: traceId });
    }
}

export async function getWorkflowMethod(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const {module ,workflow_trigger_id } = request.query as { module: string,workflow_trigger_id?:string };
        let item;
        if (module.toLowerCase() === 'job') {
            const event_slug1 = "create_job";
            const event_slug2 = "update_job";
            const module_slug = "job";
            let moduleId;
        
            if (module_slug) {
                moduleId = await Module.findOne({ where: { slug: module_slug } });
            }
        
            const module_ids = moduleId?.dataValues.id || "";
        
            let eventId1Value: any;
            let eventId2Value: any;
        
            if (module_ids && event_slug1) {
                eventId1Value = await Event.findOne({
                    where: { module_id: module_ids, slug: event_slug1, is_enabled: true }
                });
            }
            if (module_ids && event_slug2) {
                eventId2Value = await Event.findOne({
                    where: { module_id: module_ids, slug: event_slug2, is_enabled: true }
                });
            }
        
            const eventId1 = eventId1Value?.dataValues?.id || null;
            const eventId2 = eventId2Value?.dataValues?.id || null;
        
            let item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    [Op.or]: [
                        { event_id: eventId1 },
                        { event_id: eventId2 }
                    ]
                }
            });
                  
            const createReviewMethod = item.find(
                i => i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() == "review"
            );
            const updateReviewMethod = item.find(
                i => i.dataValues.event_id === eventId2 &&
                    i.dataValues.name?.trim().toLowerCase() == "review"
            );
            const createApprovalMethod = item.find(
                i => i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() == "approval"
            );
            const updateApprovalMethod = item.find(
                i => i.dataValues.event_id === eventId2 &&
                    i.dataValues.name?.trim().toLowerCase() == "approval"
            );
        
            if (createReviewMethod && updateReviewMethod && createApprovalMethod && updateApprovalMethod) {
                const response = [
                    {
                        ...createApprovalMethod.dataValues,
                        method_ids: [
                            createApprovalMethod.dataValues.id,
                            updateApprovalMethod.dataValues.id
                        ]
                    },
                    {
                        ...createReviewMethod.dataValues,
                        method_ids: [
                            createReviewMethod.dataValues.id,
                            updateReviewMethod.dataValues.id
                        ]
                    }
                ];
            const workflows = await JobWorkFlowModel.findAll({
                where: {
                    workflow_trigger_id: workflow_trigger_id,
                    is_deleted: false,
                    is_enabled: true
                }
            });
        
            if (!workflows.length) {
                return reply.status(400).send({
                    status_code: 400,
                    message: "No workflows found for the given trigger ID"
                });
            }
        
            const workflowMethodIds = workflows.map((workflow: any) => workflow.method_id);
           let responses = response.filter(i => workflowMethodIds.includes(i.id));
                const sortedResponse = responses.sort((a, b) => {
                    if (a.name?.trim().toLowerCase() === 'review') return -1;
                    if (b.name?.trim().toLowerCase() === 'review') return 1;
                    return 0; // No change for other cases
                });
        
                return reply.status(200).send({
                    status_code: 200,
                    message: "Workflow methods fetched successfully",
                    workflow_method: sortedResponse,
                });
            } else {
                return reply.status(400).send({
                    status_code: 400,
                    message: "Required workflow methods not found"
                });
            }
        }       
        else if (module.toLowerCase() === 'offer') {
            const event_slug1 = "create_offer";
            const event_slug2 = "counter_offer";
            const module_slug = "offer";

            let moduleId;
            if (module_slug) {
                moduleId = await Module.findOne({ where: { slug: module_slug } });
            }
            const module_ids = moduleId?.dataValues.id || "";

            let eventId1Value: any;
            let eventId2Value: any;

            if (module_ids && event_slug1) {
                eventId1Value = await Event.findOne({
                    where: { module_id: module_ids, slug: event_slug1, is_enabled: true },
                });
            }
            if (module_ids && event_slug2) {
                eventId2Value = await Event.findOne({
                    where: { module_id: module_ids, slug: event_slug2, is_enabled: true },
                });
            }

            const eventId1 = eventId1Value?.dataValues?.id || null;
            const eventId2 = eventId2Value?.dataValues?.id || null;

            const items = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    [Op.or]: [
                        { event_id: eventId1 },
                        { event_id: eventId2 },
                    ],
                },
            });

            const createReviewMethod = items.find(
                (i) =>
                    i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() === "review"
            );
            const createApprovalMethod = items.find(
                (i) =>
                    i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() === "approval"
            );
            const counterReviewMethod = items.find(
                (i) =>
                    i.dataValues.event_id === eventId2 &&
                    i.dataValues.name?.trim().toLowerCase() === "review"
            );
            const counterApprovalMethod = items.find(
                (i) =>
                    i.dataValues.event_id === eventId2 &&
                    i.dataValues.name?.trim().toLowerCase() === "approval"
            );

            if (createReviewMethod && createApprovalMethod && counterReviewMethod && counterApprovalMethod) {
                const response = [
                    {
                        ...createApprovalMethod.dataValues,
                        method_ids: [
                            createApprovalMethod.dataValues.id,
                            counterApprovalMethod.dataValues.id
                        ]
                    },
                    {
                        ...createReviewMethod.dataValues,
                        method_ids: [
                            createReviewMethod.dataValues.id,
                            counterReviewMethod.dataValues.id
                        ]
                    }
                ];
                const workflows = await JobWorkFlowModel.findAll({
                    where: {
                        workflow_trigger_id: workflow_trigger_id,
                        is_updated: false,
                        is_deleted: false,
                        is_enabled: true
                    }
                });
            
                if (!workflows.length) {
                    return reply.status(400).send({
                        status_code: 400,
                        message: "No workflows found for the given trigger ID"
                    });
                }
            
                const workflowMethodIds = workflows.map((workflow: any) => workflow.method_id);
               let responses = response.filter(i => workflowMethodIds.includes(i.id));
                const sortedResponse = responses.sort((a, b) => {
                    if (a.name?.trim().toLowerCase() === 'review') return -1;
                    if (b.name?.trim().toLowerCase() === 'review') return 1;
                    return 0; // No change for other cases
                });
            
                return reply.status(200).send({
                    status_code: 200,
                    message: "Workflow methods fetched successfully",
                    workflow_method: sortedResponse,
                });
            } else {
                return reply.status(400).send({
                    status_code: 400,
                    message: "Required workflow methods not found"
                });
            }
        } else if (module.toLowerCase() === 'assignment'||module.toLowerCase() === 'assignments') {
            const event_slug1 = "create_assignment";
            const event_slug2 = "update_assignment";
            const event_slug3 = "assignment_budget_adjustment";
            const module_slug = "assignment";
            let moduleId;
            if (module_slug) {
                moduleId = await Module.findOne({ where: { slug: module_slug } });
            }
            const module_ids = moduleId?.dataValues.id || "";
            let eventId1Value: any;
            let eventId2Value: any;
            let eventId3Value: any;

            if (module_ids && event_slug1) {
                eventId1Value = await Event.findOne({
                    where: { module_id: module_ids, slug: event_slug1, is_enabled: true },
                });
            }
            if (module_ids && event_slug2) {
                eventId2Value = await Event.findOne({
                    where: { module_id: module_ids, slug: event_slug2, is_enabled: true },
                });
            }
            if (module_ids && event_slug3) {
                eventId3Value = await Event.findOne({
                    where: { module_id: module_ids, slug: event_slug3, is_enabled: true },
                });
            }

            const eventId1 = eventId1Value?.dataValues?.id || null;
            const eventId2 = eventId2Value?.dataValues?.id || null;
            const eventId3 = eventId3Value?.dataValues?.id || null;

            const items = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    [Op.or]: [
                        { event_id: eventId1 },
                        { event_id: eventId2 },
                        { event_id: eventId3 },
                    ],
                },
            });

            const createApprovalMethod = items.find(
                (i) =>
                    i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() === "approval"
            );
            const updateApprovalMethod = items.find(
                (i) =>
                    i.dataValues.event_id === eventId2 &&
                    i.dataValues.name?.trim().toLowerCase() === "approval"
            );
            const budgetAdjustmentApprovalMethod = items.find(
                (i) =>
                    i.dataValues.event_id === eventId3 &&
                    i.dataValues.name?.trim().toLowerCase() === "approval"
            );
            if (createApprovalMethod && updateApprovalMethod && budgetAdjustmentApprovalMethod) {
                const response = [
                    {
                        ...createApprovalMethod.dataValues,
                        method_ids: [
                            createApprovalMethod.dataValues.id,
                            updateApprovalMethod.dataValues.id,
                            budgetAdjustmentApprovalMethod.dataValues.id
                        ]
                    }
                ];
                const sortedResponse = response.sort((a, b) => {
                    if (a.name?.trim().toLowerCase() === 'review') return -1;
                    if (b.name?.trim().toLowerCase() === 'review') return 1;
                    return 0; // No change for other cases
                });
            
                return reply.status(200).send({
                    status_code: 200,
                    message: "Workflow methods fetched successfully",
                    workflow_method: sortedResponse,
                });
            } else {
                return reply.status(400).send({
                    status_code: 400,
                    message: "Required workflow methods not found"
                });
            }
        } else if (module === 'submit_candidate_rehire_check' ) {
            const event_slug1 = "submit_candidate_rehire_check";
            const event_slug2 = "submit_candidate_shortlist";
            const module_slug = "submission";
        
            let moduleId;
            if (module_slug) {
                moduleId = await Module.findOne({ where: { slug: module_slug } });
            }
        
            const module_ids = moduleId?.dataValues.id || "";
        
            let eventId1Value = await Event.findOne({
                where: { module_id: module_ids, slug: event_slug1, is_enabled: true },
            });
            let eventId2Value = await Event.findOne({
                where: { module_id: module_ids, slug: event_slug2, is_enabled: true },
            });
        
            const eventId1 = eventId1Value?.dataValues?.id || null;
            const eventId2 = eventId2Value?.dataValues?.id || null;
        
            let item = await WorkflowMethod.findAll({
                where: {
                    module_id: module_ids,
                    [Op.or]: [
                        { event_id: eventId1 },
                        { event_id: eventId2 }
                    ],
                },
            });
        
            const rehireReviewMethod = item.find(
                (i) => i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() === "review"
            );
        
            const shortlistReviewMethod = item.find(
                (i) => i.dataValues.event_id === eventId2 &&
                    i.dataValues.name?.trim().toLowerCase() === "review"
            );
        
            const rehireApprovalMethod = item.find(
                (i) => i.dataValues.event_id === eventId1 &&
                    i.dataValues.name?.trim().toLowerCase() === "approval"
            );
        
            let response: { [key: string]: any }[] = [];
        
            if (rehireReviewMethod && shortlistReviewMethod && rehireApprovalMethod) {
                response = [
                    { ...rehireApprovalMethod.dataValues },
                    {
                        ...rehireReviewMethod.dataValues,
                        method_ids: [
                            rehireReviewMethod.dataValues.id,
                            shortlistReviewMethod.dataValues.id
                        ],
                    },
                ];
            } else if (rehireReviewMethod || rehireApprovalMethod) {
                response = [
                    { ...rehireReviewMethod?.dataValues || rehireApprovalMethod?.dataValues }
                ];
            } else if (shortlistReviewMethod) {
                response = [{ ...shortlistReviewMethod.dataValues }];
            }
        
            const workflows = await JobWorkFlowModel.findAll({
                where: {
                    workflow_trigger_id: workflow_trigger_id,
                    is_deleted: false,
                    is_enabled: true,
                },
            });
        
            if (!workflows.length) {
                return reply.status(400).send({
                    status_code: 400,
                    message: "No workflows found for the given trigger ID",
                    trace_id: traceId,
                });
            }
        
            const workflowMethodIds = workflows.map((workflow) => workflow.method_id);
            let responses = response.filter((i) => workflowMethodIds.includes(i.id));
        
            const sortedResponse = responses.sort((a, b) => {
                if (a.name?.trim().toLowerCase() === 'review') return -1;
                if (b.name?.trim().toLowerCase() === 'review') return 1;
                return 0;
            });
        
            return reply.status(200).send({
                status_code: 200,
                message: "Workflow methods fetched successfully",
                workflow_method: sortedResponse,
                trace_id: traceId,
            });
        } 
         else if (module === 'submit_candidate_shortlist') {
            const event_slug = "submit_candidate_shortlist";
            const module_slug = "submission";
            let moduleId
            if (module_slug) {
                moduleId = await Module.findOne({ where: { slug: module_slug } })
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
            const module_slug = "candidates";
            let moduleId
            if (module_slug) {
                moduleId = await Module.findOne({ where: { slug: module_slug } })
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
                status_code: 200,
                workflow_method: sortedItems,
                trace_id: traceId
            });
        } else {
            reply.status(404).send({
                status_code: 404,
                message: 'Workflow Method Data Not Found',
                workflow_method: [],
                trace_id: traceId
            });
        }
    } catch (error) {
        console.log(error);
        
        reply.status(500).send({
            status_code: 500,
            message: 'An Error Occurred While Fetching Workflow Method.',
            error,
            trace_id: traceId
        });
    }
}
