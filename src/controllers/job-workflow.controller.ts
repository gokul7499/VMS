import { FastifyRequest, FastifyReply } from 'fastify';
import JobWorkFlowModel from '../models/job-workflow.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { JobWorkFlow, Recipient, Users, Workflow } from '../interfaces/job-workflow.interface';
import { sequelize } from '../config/instance';
import { QueryTypes } from 'sequelize';
import WorkflowStatusHistory from '../models/workflow-status-history.model';
import { Module } from '../models/module.model';
import Event from '../models/event.model';
import { decodeToken } from '../middlewares/verifyToken';
import { logger } from '../utility/loggerService';
import { NotificationDataPayload } from "../interfaces/noifications-data-payload.interface";
import { EmailRecipient } from "../interfaces/email-recipient";
import { sendNotification } from '../utility/notificationService';
import { FetchUsersBasedOnHierarchy, getWorkflowDetails } from "../utility/notification-helper";
import sendNotificationModel from '../models/send-notifications-log.model';
import axios from 'axios';
import { databaseConfig } from '../config/db';

const AUTH_BASE_URL = databaseConfig.config.auth_url;
let SOURCE_BASE_URL = databaseConfig.config.sourcing_url
let TEAI_BASE_URL = databaseConfig.config.teai_url


export const createJobWorkFlow = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const workflow = request.body as JobWorkFlow;
    const traceId = generateCustomUUID();
    const { program_id } = request.params;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: "Unauthorized - Invalid token" });
    }
    const userId = user?.sub;

    const workflowData = {
        ...workflow,
        program_id,
        created_by: userId,
        updated_by: userId,
    };

    logger({
        trace_id: traceId,
        actor: { user_name: user?.preferred_username, user_id: userId },
        data: request.body,
        eventname: "creating job workflow",
        status: "in_progress",
        description: `Creating job workflow for program ID: ${program_id}`,
        level: "info",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
    }, JobWorkFlowModel);

    try {
        const createdWorkflow = await JobWorkFlowModel.create(workflowData);

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "created job workflow",
            status: "success",
            description: `Created job workflow for program ID: ${program_id} successfully: ${createdWorkflow.id}`,
            level: "success",
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false,
        }, JobWorkFlowModel);

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: createdWorkflow.id,
            message: 'Workflow created successfully.',
        });
    } catch (error) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "creating job workflow",
            status: "error",
            description: `Error creating job workflow for program ID: ${program_id}`,
            level: "error",
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false,
        }, JobWorkFlowModel);
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating job workflow.',
            trace_id: traceId,
            error: (error as any).message,
        });
    }
};


export const getAllJobWorkFlow = async (
    request: FastifyRequest<{
        Querystring: { page?: number; limit?: number; workflow_id?: string; method_id?: string; event_id?: string, module: string, job_id: string, module_id?: string },
        Params: { program_id: string }
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params;

    const { page = 1, limit = 10, workflow_id, method_id, event_id, module, job_id, module_id } = request.query;
    const offset = (page - 1) * limit;

    try {
        const whereCondition: any = {
            program_id,
            is_deleted: false,
            ...(workflow_id && { workflow_id }),
            ...(method_id && { method_id }),
            ...(event_id && { event_id }),
            ...(module && { module: module_id }),
            ...(job_id && { job_id }),

        };

        const { rows: workflows, count } = await JobWorkFlowModel.findAndCountAll({
            where: whereCondition,
            limit,
            offset,
        });

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Job workflow fetched successfully.',
            total: count,
            page,
            limit,
            job_workflow: workflows,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to fetch job workflow',
            trace_id: traceId,
            error,
        });
    }
};


export const getJobWorkFlowById = async (
    request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;

    try {
        const workflow = await JobWorkFlowModel.findAll({
            where: {
                id,
                program_id,
                is_deleted: false,
            }
        });

        if (!workflow) {
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: 'Workflow data not found.',
                job_workflow: [],
            });
        }

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            job_workflow: workflow,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error.',
            trace_id: traceId,
        });
    }
};

export const updateWorkflowStatus = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; user_id?: string; notes?: string; behavior?: string, job_id?: string, hierarchy_ids?: any[], is_admin_override?: boolean }
        | { placement_order: number; new_status: string; user_id?: string; notes?: string; behavior?: string, job_id?: string, hierarchy_ids?: any[], is_admin_override?: boolean }[];

    }>,
    reply: FastifyReply
) => {

    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    const { program_id, id } = request.params;
    let updates = request.body;

    // Convert to array if not already
    if (!Array.isArray(updates)) {
        updates = [updates];
    }

    // Validate input parameters
    if (!program_id || !id || updates.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, and at least one update are required.",
            trace_id: traceId,
        });
    }

    try {
        const userResult = await getUsersStatus(sequelize, userId, program_id);
        let userData = userResult[0] as any
        let impersonator_id: any
        if (user.impersonator) {
            impersonator_id = user.impersonator.id || null
        }
        const workflow: any = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }

        // let managerData: any = await getManagerDetails(program_id, id)
        let levels = workflow.levels || [];
        let updatedLevels = false;


        for (const { placement_order, new_status, user_id, notes, behavior, job_id, hierarchy_ids, is_admin_override } of updates) {
            let levelFound = false;

            levels = await Promise.all(
                levels.map(async (level: any) => {


                    if (level.placement_order === placement_order) {
                        levelFound = true;
                        updatedLevels = true;

                        const updatedRecipientTypes = await Promise.all(
                            level.recipient_types.map(async (recipient: any) => {
                                // Check user type
                                const isSuperUser = user.userType = "super_user"

                                if (!isSuperUser && behavior?.toLowerCase() === "any".toLowerCase() && level.placement_order === placement_order) {
                                    // Check if the recipient's user_id matches any value in meta_data
                                    const matchesUser = Object.values(recipient.meta_data).includes(user_id);
                                    const history = await WorkflowStatusHistory.create({
                                        job_workflow_id: id,
                                        placement_order,
                                        new_status,
                                        program_id,
                                        notes: notes || "",
                                        created_on: Date.now(),
                                        user_id: user_id,
                                    });
                                    return {
                                        ...recipient,
                                        status: matchesUser ? "approved" : "Not needed", // Set status based on the match
                                        impersonate_by: impersonator_id,
                                        updated_on: Date.now(),
                                        status_id: history.dataValues?.id,
                                        actor_first_name: userData?.first_name,
                                        actor_last_name: userData?.last_name,
                                        actor_by_avtar: userData?.avatar,
                                    };
                                } else
                                    if (isSuperUser) {
                                        if (behavior?.toLowerCase() === "any" && level.placement_order === placement_order) {
                                            // Check if the recipient's user_id matches any value in meta_data
                                            const matchesUser = Object.values(recipient.meta_data).includes(user_id);
                                            const history = await WorkflowStatusHistory.create({
                                                job_workflow_id: id,
                                                placement_order,
                                                new_status,
                                                program_id,
                                                notes: notes || "",
                                                created_on: Date.now(),
                                                user_id: user_id,
                                            });
                                            return {
                                                ...recipient,
                                                status: "approved",
                                                impersonate_by: impersonator_id,
                                                updated_on: Date.now(),
                                                status_id: history.dataValues?.id,
                                                actor_first_name: userData?.first_name,
                                                actor_last_name: userData?.last_name,
                                                actor_by_avtar: userData?.avatar,
                                            };
                                        }
                                    }
                                // Check if user is not a "super_user" and proceed with matchinj
                                if (!isSuperUser) {
                                    if (user_id) {
                                        // If the recipient has a `replaced_by` field, match `user_id` directly
                                        if (recipient.replaced_by && recipient.replaced_by === user_id) {
                                            const history = await WorkflowStatusHistory.create({
                                                job_workflow_id: id,
                                                placement_order,
                                                new_status,
                                                program_id,
                                                notes: notes || "",
                                                created_on: Date.now(),
                                                user_id: user_id,
                                            });
                                            return {
                                                ...recipient, status: new_status, status_id: history.dataValues.id, imporsonate_by: impersonator_id,
                                                actor_first_name: userData?.first_name,
                                                actor_last_name: userData?.last_name,
                                                actor_by_avatar: userData?.avatar, updated_on: Date.now(),
                                            };
                                        }

                                        // If the recipient does not have `replaced_by`, check `meta_data`
                                        if (!recipient.replaced_by && recipient.meta_data) {
                                            const matchesUser = Object.values(recipient.meta_data).includes(user_id);
                                            if (matchesUser) {
                                                const history = await WorkflowStatusHistory.create({
                                                    job_workflow_id: id,
                                                    placement_order,
                                                    new_status,
                                                    program_id,
                                                    notes: notes || "",
                                                    created_on: Date.now(),
                                                    user_id: user_id,
                                                });
                                                return {
                                                    ...recipient, status: new_status, status_id: history.dataValues.id, imporsonate_by: impersonator_id,
                                                    actor_first_name: userData?.first_name,
                                                    actor_last_name: userData?.last_name,
                                                    actor_by_avatar: userData?.avatar, updated_on: Date.now(),
                                                };

                                            }
                                        }
                                    }
                                } else {
                                    // If user is a super_user, update status regardless
                                    const history = await WorkflowStatusHistory.create({
                                        job_workflow_id: id,
                                        placement_order,
                                        new_status,
                                        program_id,
                                        notes: notes || "",
                                        created_on: Date.now(),
                                        user_id: user_id,
                                    });
                                    return {
                                        ...recipient, status: new_status, status_id: history.dataValues.id, imporsonate_by: impersonator_id,
                                        actor_first_name: userData?.first_name,
                                        actor_last_name: userData?.last_name,
                                        actor_by_avatar: userData?.avatar, updated_on: Date.now(),
                                    };

                                }

                                // If no match, return original recipient
                                return recipient;
                            })
                        );

                        // Determine the level status
                        const allApproved = updatedRecipientTypes.every(
                            (recipient: any) => recipient.status === "approved" || recipient.status === "Not needed"
                        );
                        return {
                            ...level,
                            status: allApproved ? "completed" : "pending",
                            recipient_types: updatedRecipientTypes,
                        };
                    }
                    if (is_admin_override) {
                        // Slice levels from index 1 onwards
                        const slicedLevels = levels.slice(1);

                        // Update only recipient_types in levels from index 1 onwards
                        slicedLevels.forEach((level: any) => {
                            level.recipient_types = level.recipient_types.map((recipient: any) => ({
                                ...recipient,
                                status: "approved",
                                is_admin_override: is_admin_override,
                                actor_first_name: userData.first_name,
                                actor_last_name: userData.last_name,
                                actor_by_avtar: userData.avatar,
                                imporsonate_by: impersonator_id,
                                updated_on: Date.now(),
                            }));
                            level.status = "completed";
                        });


                    }
                    return level;
                })
            );

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }
            let allLevelsAfterFirstCompleted = true;
            let workflowStatus = "completed";

            // Loop through levels and process
            for (let i = 0; i < levels.length; i++) {
                const level = levels[i];

                // Skip this level if recipient_types is empty or any recipient has meta_data with null values
                const isValidLevel = level.recipient_types &&
                    level.recipient_types.length > 0 && // Ensure recipient_types is not empty
                    level.recipient_types.every((recipient: any) => {
                        return recipient.meta_data !== null &&
                            Object.values(recipient.meta_data).every(value => value !== null);
                    });

                if (!isValidLevel) {
                    continue;
                }
                // If the level is valid (all meta_data are non-null), check the status
                if (level.status === "pending") {
                    allLevelsAfterFirstCompleted = false;
                }
            }
            // Set final workflow status based on valid levels
            workflowStatus = allLevelsAfterFirstCompleted ? "completed" : "pending";
            const is_updatedFlag = allLevelsAfterFirstCompleted ? true : false;

            // Update the workflow object
            workflow.status = workflowStatus;
            workflow.is_updated = is_updatedFlag;

            await workflow.update({ levels, status: workflowStatus, is_updated: is_updatedFlag, updated_on: Date.now(), updated_by: userId });

            let allPayload = {
                hierarchy_ids: hierarchy_ids,
                program_id: program_id,

            };

            if (workflowStatus === "completed") {
                await updatePendingApprovalStatus(request, reply, program_id, id, workflow)
                let eventCode = await getEventsCode(workflow);
                let allPayload = {
                    hierarchy_ids: hierarchy_ids || null,
                    program_id: program_id,
                    user_type: eventCode.user_type

                };
                let data = await handleJobWorkflowStatus(request, reply, workflowStatus, workflow, updates, program_id, id, allPayload, eventCode);
                await updateWorkflowPreviousCompltedStatus(request, reply, workflow)
            }
        }

        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }


        return reply.status(200).send({
            status_code: 200,
            message: "Approved done successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating  workflow:", error);

        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update  workflow.",
            trace_id: traceId,
        });
    }
};
export async function updateWorkflowPreviousCompltedStatus(request: FastifyRequest, reply: FastifyReply, workflow: any) {
    try {
        const userQuery = `
        SELECT *
        FROM workflow
        WHERE workflow_trigger_id = :workflow_trigger_id
        AND status = 'completed'
        AND flow_type = 'Review'
        AND is_enabled = true;
        `;

        const workflowResult = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { workflow_trigger_id: workflow.workflow_trigger_id },
        });

        // Check if workflow data exists
        let workflowData: any = workflowResult[0];

        if (workflowData) {
            // Now use Sequelize to find the workflow record and update it
            const updatedWorkflow = await JobWorkFlowModel.findOne({
                where: { id: workflowData.id }
            });

            if (updatedWorkflow) {
                // Update the record
                await updatedWorkflow.update({
                    is_updated: true
                });

            }
        }


    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",

        });
    }
}
export async function getUsersStatus(sequelize: any, userId: any, program_id: any) {

    const userQuery = `
        SELECT user_id, status,first_name,last_name,avatar
        FROM user
        WHERE user_id IN (:userId)  
          AND is_enabled = true;`;

    const users = await sequelize.query(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { userId },
    });

    return users.map((user: any) => ({
        user_id: user.user_id || null,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        avatar: user.avatar?.url || null,
        status: user.status || null,
    }));
}
export async function updatePendingApprovalStatus(request: FastifyRequest, reply: FastifyReply, program_id: any, id: any, workflow: any) {


    try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ message: 'Unauthorized - Token not found' });
        }

        const token = authHeader.split(' ')[1];
        const user = await decodeToken(token);

        if (!user) {
            return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
        }
        const moduleType = workflow.module_type.toLowerCase();
        if (moduleType === "job".toLowerCase() || moduleType === "jobs".toLowerCase()) {
            const job_id = workflow.workflow_trigger_id;
            const apiUrl = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/job-status/${job_id}`;
            const payload = {
                status: "OPEN",
            };
            console.log(apiUrl);

            let a = await axios.put(apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization: authHeader
                },
            });


        } else
            if (moduleType === "offer".toLowerCase() || moduleType === "offers".toLowerCase()) {
                const offer_id = workflow.workflow_trigger_id;
                const apiUrl = `${SOURCE_BASE_URL}/v1/api/offer-release/program/${program_id}/offer/${offer_id}`;
                const payload = {
                    status: "Released",
                };
                await axios.put(apiUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: authHeader
                    },
                });
            } else
                if (moduleType === "Submissions".toLowerCase()) {
                    const submission_id = workflow.workflow_trigger_id;
                    const apiUrl = `${SOURCE_BASE_URL}/v1/api/update-submission-status/program/${program_id}/submission-candidate/${submission_id}`;
                    const payload = {
                        status: "submitted",
                    };

                    await axios.post(apiUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            authorization: authHeader
                        },
                    });

                } else


                    if (moduleType === "Assignment".toLowerCase()) {
                        console.log('inside assignment approval status')
                        const assignment_id = workflow.workflow_trigger_id;
                        const apiUrl = `${TEAI_BASE_URL}/assignment/v1/program/${program_id}/assignments/${assignment_id}/update-status`;
                        const payload = { status: "approved", display_status: 'approved' };
                        console.log('payload for update status:', payload)
                        await axios.put(apiUrl, payload, {
                            headers: {
                                'Content-Type': 'application/json',
                                authorization: authHeader
                            },
                        });
                    }

    } catch (error) {
        console.error('error while updating status:', error);
        return reply.status(500).send({ message: 'Internal Server Error' });
    }
}
export async function updateRejectStatusInAllWorkflowModule(request: FastifyRequest, reply: FastifyReply, program_id: any, id: any, workflow: any) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ message: 'Unauthorized - Token not found' });
        }

        const token = authHeader.split(' ')[1];
        const user = await decodeToken(token);

        if (!user) {
            return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
        }
        const moduleType = workflow.module_type.toLowerCase();
        if (moduleType === "job".toLowerCase() || moduleType === "jobs".toLowerCase()) {
            const job_id = workflow.workflow_trigger_id;
            const apiUrl = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/job-status/${job_id}`;
            const payload = {
                status: "REJECTED",
            };

            await axios.put(apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization: authHeader
                },
            });
        } else if (moduleType === "offer".toLowerCase() || moduleType === "offers".toLowerCase()) {
            const offer_id = workflow.workflow_trigger_id;
            const apiUrl = `${SOURCE_BASE_URL}/v1/api/offer-release/program/${program_id}/offer/${offer_id}`;
            const payload = {
                status: "Rejected",
            };

            await axios.put(apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization: authHeader
                },
            });
        } else
            if (moduleType === "Submissions".toLowerCase()) {
                const offer_id = workflow.workflow_trigger_id;
                const apiUrl = `${SOURCE_BASE_URL}/v1/api/update-submission-status/program/${program_id}/submission-candidate/${offer_id}`;
                const payload = {
                    status: "Rejected",
                };

                await axios.post(apiUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: authHeader
                    },
                });
            }
            else if (moduleType === "Assignment".toLowerCase()) {
                const assignment_id = workflow.workflow_trigger_id;
                const apiUrl = `${TEAI_BASE_URL}/assignment/v1/program/${program_id}/assignments/${assignment_id}/update-status`;
                const payload = {
                    status: "rejected",
                    display_status: "rejected"
                };

                await axios.put(apiUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: authHeader
                    },
                });

            }

    } catch (error) {
        console.error(error);
        return reply.status(500).send({ message: 'Internal Server Error' });
    }
}
async function handleJobWorkflowStatus(request: FastifyRequest, reply: FastifyReply, workflowStatus: any, workflow: any, updates: any, program_id: any, id: any, allPayload: any, eventCode: any) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    (async () => {

        const userQuery = `
        SELECT user_id, user_type,email
        FROM user
        WHERE user_id = :user_id
        AND is_enabled = true
        LIMIT 1
    `;

        const userData: any = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { user_id: user.sub },
        });
        let userType = userData[0]
        if (userType.user_type.toLowerCase() == "msp".toLowerCase() || userType.user_type.toLowerCase() == "client".toLowerCase() || user.userType.toLowerCase() == "super_user".toLowerCase()) {

            // Fetch manager details
            let managerData: any = await getManagerDetails(program_id, id);
            const payload = {
                user_type: user?.userType,
                fullName: managerData?.data?.first_name,
                job_id: workflow?.event_title,
                status_reason: updates[0]?.reason
            };

            const recipientEmailArray: EmailRecipient[] = [];
            // Prepare and send notification for manager data
            if (managerData && managerData.data && managerData.data.email) {

                const recipeintEmail: EmailRecipient = {
                    email: managerData.data.email,
                    first_name: managerData.data.first_name,
                    last_name: managerData.data.last_name
                }
                recipientEmailArray.push(recipeintEmail);

            } else {
                console.log("Manager data is missing or email not found.");
            }
            let mspUserData: any = await FetchUsersBasedOnHierarchy(sequelize, allPayload);

            // Check if mspUserData is an array and send emails to each user
            if (Array.isArray(mspUserData) && mspUserData.length > 0) {
                for (const user of mspUserData) {
                    const recipeintEmail: EmailRecipient = {
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name
                    }
                    recipientEmailArray.push(recipeintEmail);
                }
                const notificationPayload: NotificationDataPayload = {
                    program_id: program_id ?? "",
                    token,
                    traceId,
                    eventCode: eventCode.eventCode,
                    recipientEmail: recipientEmailArray,
                    payload,
                    userId: user.sub ?? "",
                };

                sendNotification(notificationPayload);


            } else {
                console.log("No MSP users found or no email available for notification.");
            }

        } else {
            console.log("User type is not CLIENT/MSP/SUPER_USER, skipping logic.");
        }
    })();
}

async function getEventsCode(workflow: { flow_type: any, events: any }) {
    let { flow_type, events } = workflow
    console.log(flow_type, events);

    if (flow_type == "Approval" && events === "create_job") {
        let response = {
            eventCode: "JOB_APPROVAL_COMPLETE",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_job") {
        let response = {
            eventCode: "JOB_UPDATE_APPROVAL",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_offer") {
        let response = {
            eventCode: "OFFER_APPROVAL_COMPLETE",
            user_type: ['msp']
        }
        return response;

    } else if (flow_type == "Approval" && events === "counter_offer") {
        let response = {
            eventCode: "COUNTER_OFFER_APPROVAL_COMPLETE",
            user_type: ['msp', 'vendor']
        }
        return response;

    } else if (flow_type == "Approval" && events === "submit_candidate_rehire_check") {
        let response = {
            eventCode: "REHIRE_APPROVAL_COMPLETE",
            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_assignment") {
        let response = {
            eventCode: "ASSIGNMENT_APPROVAL_COMPLETE",
            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_assignment") {
        let response = {
            eventCode: "ASSIGNMENT_MODIFIED_APPROVAL_COMPLETE",
            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events == "BUDGET_INCREASED" || events === "assignment_budget_adjustment") {
        let response = {
            eventCode: "BUDGET_INCREASE_APPROVED",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events == "BUDGET_REDUCED" || events === "assignment_budget_adjustment") {
        let response = {
            eventCode: "BUDGET_REDUCED_APPROVAL",
            user_type: ['msp']
        }
        return response;
    } else {
        throw new Error(`Event code not found for event: ${events}`);
    }

}
async function getRejectEventsCode(workflow: { flow_type: any, events: any }) {
    let { flow_type, events } = workflow
    if (flow_type == "Approval" && events === "create_job") {
        let response = {
            eventCode: "JOB_APPROVAL_REJECT",
            user_type: ['msp']
        }
        return response;
    } if (flow_type == "Review" && events === "create_job") {
        let response = {
            eventCode: "JOB_REVIEW_REJECT",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_job") {
        let response = {
            eventCode: "JOB_UPDATE_APPROVAL_REJECTED",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "update_job") {
        let response = {
            eventCode: "JOB_UPDATE_REVIEW_REJECT",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "create_offer") {
        let response = {
            eventCode: "OFFER_REVIEW_REJECT",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_offer") {
        let response = {
            eventCode: "OFFER_APPROVAL_REJECT",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "counter_offer") {
        let response = {
            eventCode: "COUNTER_OFFER_REVIEW_REJECT",
            user_type: ['msp']
        }
        return response;

    } else if (flow_type == "Approval" && events === "counter_offer") {
        let response = {
            eventCode: "COUNTER_OFFER_APPROVAL_REJECT",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "submit_candidate_shortlist") {
        let response = {
            eventCode: "CANDIDATE_SHORTLIST_REJECTED",
            user_type: ['msp']
        }
        return response;

    } else if (flow_type == "Review" && events === "submit_candidate_rehire_check") {
        let response = {
            eventCode: "REHIRE_REVIEW_REJECT",
            user_type: ['msp', 'vendor']
        }
        return response;

    } else if (flow_type == "Approval" && events === "submit_candidate_rehire_check") {
        let response = {
            eventCode: "REHIRE_APPROVAL_REJECT",
            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_assignment") {
        let response = {
            eventCode: "ASSIGNMENT_APPROVAL_REJECTED",
            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_assignment") {
        let response = {
            eventCode: "ASSIGNMENT_MODIFIED_REJECTED",
            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "BUDGET_INCREASED" || events === "assignment_budget_adjustment") {
        let response = {
            eventCode: "BUDGET_INCREASE_REJECTED",
            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "BUDGET_REDUCED" || events === "assignment_budget_adjustment") {
        let response = {
            eventCode: "BUDGET_REDUCED_REJECTED",
            user_type: ['msp']
        }
        return response;
    } else {
        throw new Error(`events code not found for event: ${events}`);
    }

}
export async function fetchUsersBasedOnHierarchy(allPayload: { hierarchy_ids: any[], program_id: any }) {
    try {
        const { hierarchy_ids, program_id } = allPayload;

        // Query to fetch users based on hierarchy_ids and program_id
        const query = `
          SELECT u.*
          FROM user u
          WHERE u.program_id = :program_id
          AND u.user_type IN ('msp', 'vendor')
          AND (
              u.is_all_hierarchy_associate = true
              OR (
                  u.is_all_hierarchy_associate = false
                  AND EXISTS (
                      SELECT 1
                      FROM JSON_TABLE(
                          u.associate_hierarchy_ids,
                          '$[*]' COLUMNS (hierarchy_id INT PATH '$')
                      ) AS jt
                      WHERE jt.hierarchy_id IN (:hierarchy_ids)
                  )
              )
          );
      `;

        const users = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: {
                program_id: program_id,
                hierarchy_ids: hierarchy_ids,
            },
        });




        return users || null; // Return the list of users that match the criteria.
    } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Error fetching users based on hierarchy and program_id.");
    }
}

async function getManagerDetails(program_id: any, workflowId: any) {
    try {
        // Step 1: Query the workflow table to get the manager ID
        const workflowQuery = `
            SELECT id, manager,events
            FROM workflow
            WHERE id = :id
            AND is_enabled = true
            LIMIT 1
        `;

        const workflowResult: any = await sequelize.query(workflowQuery, {
            type: QueryTypes.SELECT,
            replacements: { id: workflowId },
        });

        if (workflowResult.length === 0) {
            return { status: 'Error', message: 'Workflow not found or disabled' };
        }

        const managerId = workflowResult[0].manager;

        // Step 2: Query the user table to get the manager details
        const userQuery = `
            SELECT user_id, email,first_name ,last_name
            FROM user
            WHERE user_id = :managerId
              AND program_id=:program_id    
            LIMIT 1
        `;

        const userResult = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { managerId, program_id },
        });

        if (userResult.length === 0) {
            return { status: 'Error', message: 'Manager not found' };
        }

        return { status: 'Success', data: userResult[0] || null };
    } catch (error) {
        console.error('Error fetching manager details:', error);
        return { status: 'Error', message: 'An error occurred while fetching manager details', error };
    }
}
export const rejectLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; reason: string; user_id: string; notes?: string, job_id?: string, hierarchy_ids: any[] }
        | { placement_order: number; new_status: string; reason: string; user_id: string; notes?: string, job_id?: string, hierarchy_ids: any[] }[];
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    let updates = request.body;
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    const isSuperUser = user?.userType === "super_user";
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    if (!Array.isArray(updates)) {
        updates = [updates];
    }

    if (!program_id || !id || updates.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, and at least one update are required.",
            trace_id: traceId,
        });
    }
    try {
        const workflow: any = await JobWorkFlowModel.findOne({ where: { id, program_id } });
        let impersonator_id: any
        if (user.impersonator) {
            impersonator_id = user.impersonator.id || null
        }
        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }
        // Parse levels array
        let levels = workflow.levels || [];
        let updatedLevels = false;
        updates.forEach(({ placement_order, new_status, user_id, notes, reason }) => {


            if (new_status !== "rejected") {
                throw new Error("Only 'rejected' status is allowed for this operation.");
            }

            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order >= placement_order) {
                    updatedLevels = true;

                    if (level.placement_order === placement_order) {
                        levelFound = true;

                        const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                            if (isSuperUser) {
                                // Superuser logic: Skip user_id matching
                                return {
                                    ...recipient,
                                    status: "rejected",
                                    updated_on: Date.now(),
                                    notes: notes,
                                    reason: reason,
                                };
                            }
                            if (
                                (recipient.replaced_by && recipient.replaced_by === user_id) ||
                                (!recipient.replaced_by &&
                                    recipient.meta_data &&
                                    Object.values(recipient.meta_data).includes(user_id))
                            ) {

                                return { ...recipient, status: "rejected", imporsonate_by: impersonator_id, updated_on: Date.now(), notes: notes, reason: reason };

                            }

                            return { ...recipient, status: "canceled", imporsonate_by: impersonator_id, updated_on: Date.now(), notes: notes, reason: reason };

                        });
                        return {
                            ...level,
                            updated_on: Date.now(),
                            status: "Rejected",
                            recipient_types: updatedRecipientTypes,
                        };
                    }
                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => ({
                        ...recipient,
                        status: "canceled",
                        updated_on: Date.now(), notes: notes, reason: reason
                    }));

                    return {
                        ...level,
                        updated_on: Date.now(),
                        status: "Not needed",
                        recipient_types: updatedRecipientTypes,
                    };
                }

                return level;
            });

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }

            WorkflowStatusHistory.create({
                job_workflow_id: id,
                placement_order,
                new_status: "rejected",
                program_id,
                reason,
                notes: notes || "",
                created_on: Date.now(),
                user_id: user_id,
            });
        });


        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }

        // Update the workflow with the modified levels array
        await workflow.update({ levels, is_updated: true, updated_on: Date.now() });

        let workflowStatus = "completed"
        let eventCode = await getRejectEventsCode(workflow)
        let allPayload = {
            hierarchy_ids: updates[0].hierarchy_ids,
            program_id: program_id,
            user_type: eventCode.user_type
        }
        let data = await handleJobWorkflowStatus(request, reply, workflowStatus, workflow, updates, program_id, id, allPayload, eventCode)
        await updateRejectStatusInAllWorkflowModule(request, reply, program_id, id, workflow)
        return reply.status(200).send({
            status_code: 200,
            message: "Job workflow updated successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating job workflow:", error);

        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
        });
    }
};

export const updateReplaceLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body: {
            placement_order: number;
            status: string;
            replaced_by: string;
            user_id?: string;
            notes?: string;
            job_id?: string
        };
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    const { placement_order, status, replaced_by, user_id, notes } = request.body;
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    // Validate input parameters
    if (!program_id || !id || !placement_order || !status || !replaced_by) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, placement_order, status, and replaced_by are required.",
            trace_id: traceId,
        });
    }

    try {
        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }

        let levels = workflow.levels || [];
        let levelFound = false;

        // Update the matching level
        levels = levels.map((level: any) => {
            if (level.placement_order === placement_order) {
                console.log(level.placement_order, placement_order);

                levelFound = true;

                const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                    // Check if replaced_by exists, match directly
                    if (recipient.replaced_by === user_id) {
                        return {
                            ...recipient,
                            status: status,
                            existing_replaced_user: recipient.replaced_by, // Retain the current replaced_by value
                            replaced_by, // Update replaced_by with the new value from the payload
                            replaced_notes: notes,
                            replaced_updated_on: Date.now(),
                        };
                    }

                    // If replaced_by doesn't exist, match against meta_data values
                    if (!recipient.replaced_by && Object.values(recipient.meta_data).includes(user_id)) {
                        return {
                            ...recipient,
                            status: status,
                            replaced_by,
                            meta_data: {
                                ...recipient.meta_data,
                            },
                            replaced_notes: notes,
                            replaced_updated_on: Date.now()
                        };
                    }

                    return recipient;
                });

                return {
                    ...level,
                    recipient_types: updatedRecipientTypes
                };
            }
            return level;
        });

        if (!levelFound) {
            return reply.status(400).send({
                status_code: 400,
                message: `Placement order ${placement_order} not found in levels.`,
                trace_id: traceId,
            });
        }

        // Create workflow status history if user_id is provided
        if (user_id) {
            WorkflowStatusHistory.create({
                job_workflow_id: id,
                placement_order,
                status,
                program_id,
                notes: notes ?? "",
                created_on: Date.now(),
                user_id: user.sub,
            });
        }

        // Update the workflow with the modified levels array
        await workflow.update({ levels, updated_on: Date.now() });

        return reply.status(200).send({
            status_code: 200,
            message: "Job workflow updated successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating job workflow:", error);

        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
        });
    }
};


async function fetchUserById(user_id: any) {
    const userQuery = `
        SELECT user_id, first_name, last_name, avatar, role_id,email
        FROM user
        WHERE user_id = :user_id
          AND is_enabled = true
        LIMIT 1;
    `;

    try {
        const userResult = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { user_id },
        });

        if (userResult.length > 0) {
            return userResult[0]; // Return the first user found
        } else {
            console.warn(`User with ID ${user_id} not found.`);
            return null; // Return null if no user is found
        }
    } catch (error) {
        console.error(`Error fetching user with ID ${user_id}:`, error);
        throw new Error("Failed to fetch user details.");
    }
}
export const imporsonateLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; imporsonate_by: string; user_id?: string }
        | { placement_order: number; new_status: string; imporsonate_by: string; user_id?: string }[];
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const { program_id, id } = request.params;
    let updates = request.body;


    if (!Array.isArray(updates)) {
        updates = [updates];
    }


    if (!program_id || !id || updates.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, and updates are required.",
            trace_id: traceId,
        });
    }

    try {

        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }

        let levels = workflow.levels || [];
        let updatedLevels = false;


        updates.forEach(({ placement_order, new_status, imporsonate_by, user_id }) => {
            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order === placement_order) {
                    levelFound = true;
                    updatedLevels = true;

                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                        if (user_id) {
                            if (recipient.replaced_by) {
                                // If replaced_by exists, match user_id with replaced_by
                                if (recipient.replaced_by === user_id) {
                                    return { ...recipient, status: new_status, imporsonate_by };
                                }
                            } else {
                                // If replaced_by doesn't exist, check meta_data
                                const matchesUser =
                                    recipient.meta_data &&
                                    Object.values(recipient.meta_data).includes(user_id);

                                if (matchesUser) {
                                    return { ...recipient, status: new_status, imporsonate_by };
                                }
                            }
                        } else {
                            // Update status for all recipients if user_id is not provided
                            return { ...recipient, status: new_status, };
                        }
                        return recipient;
                    });


                    const allApproved = updatedRecipientTypes.every(
                        (recipient: any) => recipient.status === "approved"
                    );

                    return {
                        ...level,
                        status: allApproved ? "completed" : "pending",
                        recipient_types: updatedRecipientTypes,
                    };
                }
                return level;
            });

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }


            WorkflowStatusHistory.create({
                job_workflow_id: id,
                placement_order,
                new_status,
                program_id,
                imporsonate_by,
                created_on: Date.now(),
                user_id: user_id || null,
            });
        });

        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }

        // Update the workflow with the modified levels array
        await workflow.update({ levels, updated_on: Date.now() });

        return reply.status(200).send({
            status_code: 200,
            message: "Job workflow updated successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating job workflow:", error);

        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
        });
    }
};

export const updateJobWorkFlow = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body: Partial<JobWorkFlow>;
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    const updateData = request.body as JobWorkFlow;


    try {
        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Workflow data not found !',
                trace_id: traceId,
            });
        }

        await workflow.update({ ...updateData, updated_on: Date.now() });


        reply.status(200).send({
            status_code: 200,
            message: 'Job workflow updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to update job workflow',
            trace_id: traceId,
        });
    }
};
export async function deleteJobWorkFlow(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();

    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const workflow = await JobWorkFlowModel.findOne({ where: { program_id, id } });

        if (workflow) {
            await JobWorkFlowModel.update({ is_deleted: true, is_enabled: false }, { where: { program_id, id } });

            reply.status(204).send({
                status_code: 204,
                message: 'Job workflow deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 404,
                message: 'Job worklfow not found.',
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to delete job workflow',
            trace_id: traceId,
            error,
        });
    }
};
export const updateWorkflowStatusData = async (
    program_id: string,
    workflow_id: string,
    updates: {
        placement_order: number;
        new_status: string;
        // user_id: string;
        behavior?: string;
        notes?: string;
    }[],
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();


    if (!program_id || !workflow_id || updates.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, workflow_id, and at least one update are required.",
            trace_id: traceId,
        });
    }
    try {
        const workflow = await JobWorkFlowModel.findOne({ where: { id: workflow_id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }
        let levels = workflow.levels || [];
        let updatedLevels = false;

        updates.forEach(({ placement_order, new_status, behavior }) => {
            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order == placement_order) {
                    levelFound = true;
                    updatedLevels = true;

                    // Update all recipients in the specified level
                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                        if (behavior === "any") {
                            return { ...recipient, status: "bypassed" };
                        }
                        return { ...recipient, status: new_status };
                    });

                    const allApproved = updatedRecipientTypes.every(
                        (recipient: any) => recipient.status === "bypassed" || recipient.status == "approved"
                    );

                    return {
                        ...level,
                        status: allApproved ? "completed" : "pending",
                        recipient_types: updatedRecipientTypes,
                    };
                }
                return level;
            });

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }
        });


        console.log("Final Updated Levels:", JSON.stringify(levels, null, 2));


        let Result = await workflow.update(
            { levels, updated_on: Date.now() },
            { where: { id: workflow_id } } // Replace with the correct identifier
        );



        console.log("Levels successfully updated in the database!", Result);


    }
    catch (error) {
        console.error("Error updating job workflow:", error);
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
        });
    }
};

export async function getWorkflowForJob(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const initialJobData = request.body as JobWorkFlow;
    logger({
        actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
        },
        data: initialJobData,
        eventname: "creating job",
        status: "info",
        description: `Creating job for ${program_id}`,
        level: 'info',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
    }, JobWorkFlowModel);
    try {
        const { method_id, job_id, workflow_trigger_id, hierarchy_id } = request.query as {
            method_id: string;
            job_id?: string;
            workflow_trigger_id: string;
            hierarchy_id: any
        };
        let hierarchy_ids = hierarchy_id.split(",").map((id: any) => id.trim());
        const methodIds = method_id.split(',');
        const query = `
            SELECT
            w.id As job_workflow_id,
                w.workflow_id AS workflow_id,
                 w.event_id AS event_id,
                   w.event_title AS event_title,
                w.name AS workflow_name,
                w.flow_type AS workflow_type,
                w.levels,
                w.status,
                w.config,
                w.manager,
                l.id AS level_id,
                l.placement_order AS placement_order,
            r.recipient_type_id,
                r.meta_data,
                r.behaviour,
                  e.name,
        e.slug AS event_slug,
                JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].status'
                        )
                    )
                ) AS level_status,

                 JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].recipient_types'
                        )
                    )
                ) AS recipient_types,
                (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.replaced_by'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.replaced_by') IS NOT NULL
            LIMIT 1
        ) AS replaced_by,

               JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].recipient_types'
                        )
                    )
                ) AS recipient_types,
                (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.existing_replaced_user'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.existing_replaced_user') IS NOT NULL
            LIMIT 1
        ) AS existing_replaced_user,




 JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].recipient_types'
                        )
                    )
                ) AS recipient_types,
                (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.imporsonate_by'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.imporsonate_by') IS NOT NULL
            LIMIT 1
        ) AS imporsonate_by,
(
    SELECT JSON_OBJECT(
        'status', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.status')), NULL),
        'updated_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.updated_on')) AS UNSIGNED), NULL),
        'notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.notes')), NULL),
        'reason', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.reason')), NULL),
         'actor_first_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_first_name')), NULL),
          'actor_last_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_last_name')), NULL),
           'actor_by_avatar', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_by_avatar')), NULL),
            'is_admin_override', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.is_admin_override')), NULL),
        'replaced_notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_notes')), NULL),
         'replaced_updated_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_updated_on')) AS UNSIGNED), NULL)
    )
    FROM JSON_TABLE(
        JSON_EXTRACT(
            w.levels,
            CONCAT('$[', l.placement_order, '].recipient_types')
        ),
        '$[*]' COLUMNS (
            value JSON PATH '$'
        )
    ) AS recipient
    WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL 
    LIMIT 1
) AS recipient_details,

         (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.status'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL
            LIMIT 1
        ) AS recipient_status
            FROM
                workflow  w
            INNER JOIN workflow_triggered_level l ON l.workflow_id = w.workflow_id AND l.workflow_trigger_id = w.workflow_trigger_id
            LEFT JOIN workflow_triggered_recepient r ON r.level_id = l.id
            LEFT JOIN event e
        ON w.event_id = e.id
         WHERE
    w.program_id = :program_id
    AND w.workflow_trigger_id = :workflow_trigger_id
    AND w.is_updated = false
    AND FIND_IN_SET(w.method_id, :method_ids) > 0
    AND JSON_OVERLAPS(w.hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))
    AND w.method_id = (
        SELECT method_id
        FROM (
            SELECT method_id
            FROM workflow
            WHERE
                program_id = :program_id
                AND FIND_IN_SET(method_id, :method_ids) > 0
                AND workflow_trigger_id = :workflow_trigger_id
                AND is_updated = false
                AND is_enabled = true
                AND JSON_OVERLAPS(hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))
            ORDER BY FIELD(method_id, ${methodIds.map((id) => `'${id}'`).join(',')})
            LIMIT 1
        ) AS prioritized_method
    )
ORDER BY       
    FIELD(w.method_id, ${methodIds.map((id) => `'${id}'`).join(',')}),
    l.placement_order ASC;`;
        const rows: any[] = await sequelize.query(query, {
            replacements: {
                method_ids: methodIds.join(','),
                program_id,
                workflow_trigger_id,
            },
            type: QueryTypes.SELECT,
        });
        console.log(rows);

        let programData = await sequelize.query(
            `SELECT * FROM workflow WHERE workflow_trigger_id = :workflow_trigger_id AND (status = "pending" OR status = "completed")`,
            {
                replacements: { workflow_trigger_id },
                type: QueryTypes.SELECT,
            }
        );

        // Create a map to store the latest status for each flow_type
        const flowTypeStatusMap = new Map<string, boolean>();

        for (const program of programData) {
            const { flow_type, status } = program as JobWorkFlow

            // If the flow_type is already in the map, prioritize "completed" status
            if (!flowTypeStatusMap.has(flow_type) || status === "completed") {
                flowTypeStatusMap.set(flow_type, status === "completed");
            }
        }

        // Convert the map to the required array format and sort
        const flowTypes = Array.from(flowTypeStatusMap.entries())
            .map(([flow_type, is_completed]) => ({ flow_type, is_completed }))
            .sort((a, b) => {
                if (a.flow_type === "Review") return -1;
                if (b.flow_type === "Review") return 1;
                return 0;
            });

        let manager = rows[0]?.manager
        if (rows.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                flowTypes: flowTypes,
                message: 'Workflow data not found',
                workflow: [],
                trace_id,
            });
        }
        const workflow: Workflow = {
            program_id: program_id,
            job_workflow_id: rows[0].job_workflow_id,
            workflow_id: rows[0].workflow_id,
            workflow_name: rows[0].workflow_name,
            workflow_type: rows[0].workflow_type,
            event_title: rows[0].event_title,
            event_slug: rows[0].event_slug,
            status: rows[0].status,
            config: rows[0].config,
            levels: [],
        };
        let previousLevelCompleted = false;
        let levelStatusMap: { [key: number]: string } = {};
        await getLevelData(request, reply, rows, workflow, manager);


        (async () => {
            let notifyUser = await sendNotificationSequencially(request, reply, workflow)

        })();
        return reply.status(200).send({
            statusCode: 200,
            flowTypes: flowTypes,
            workflow,
            trace_id,
        });
    } catch (error: any) {
        console.log(error);
        return reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching workflow data.',
            trace_id,
        });
    }
}
function getName(input_value: any): string {
    if ('first_name' in input_value && 'last_name' in input_value) {
        const firstName = (input_value as { first_name: string; last_name?: string }).first_name;
        const lastName = (input_value as { first_name: string; last_name?: string }).last_name ?? '';
        return `${firstName} ${lastName}`.trim();
    } else if ('name' in input_value) {
        return (input_value as { name: string }).name;
    }
    return '';
}
function getExistingLevel(workflow: Workflow, level_id: string) {
    return workflow.levels.find(level => level.level_id === level_id);
}
const getLevelData = async (request: FastifyRequest, reply: FastifyReply, rows: any, workflow: any, manager: any): Promise<any> => {

    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);


    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    try {
        for (const row of rows) {
            const { level_id, level_status, levels, config, recipient_status, recipient_details, placement_order, recipient_type_id, meta_data, behaviour, replaced_by, existing_replaced_user, imporsonate_by, event_slug } = row;

            if (meta_data && Object.keys(meta_data).length > 0) {
                const recipientTypeQuery = `
                SELECT id ,name
                FROM recipient_type
                WHERE id = :recipient_type_id
                AND is_enabled = true
                LIMIT 1
            `;
                const recipientTypeResult = await sequelize.query(recipientTypeQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { recipient_type_id },
                });
                const recipientType = recipientTypeResult[0] as Recipient;
                let input_value: any;
                let meta_datas = JSON.stringify(meta_data)
                const input_values = Object.values(meta_data);


                let replaced_user_data: any
                let imposonate_user_data: any
                if (recipientType?.name === 'Specific User' || recipientType?.name === 'Multiple users' || recipientType?.name === "Job Manager") {
                    if (input_values.length > 0) {
                        const userQuery = `
                        SELECT user_id,first_name, last_name, avatar, role_id,email
                        FROM user
                        WHERE user_id = :user_id    
                           AND program_id=:program_id                  
                          AND status = 'active'
                        LIMIT 1
                    `;
                        let userResult = null;
                        if (existing_replaced_user) {
                            userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: existing_replaced_user, program_id: workflow.program_id },
                            });
                        } else {
                            // If no `existing_replaced_user`, use the first `input_value`
                            userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: input_values[0], program_id: workflow.program_id },
                            });
                        }
                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        if (userResult.length && replaced_by) {
                            replacedUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: replaced_by, program_id: workflow.program_id },
                            });
                        }
                        if (userResult.length && imporsonate_by) {
                            imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: imporsonate_by, program_id: workflow.program_id },
                            });
                        }


                        input_value = userResult[0] ? {
                            id: userResult[0]?.user_id,
                            first_name: userResult[0]?.first_name,
                            last_name: userResult[0]?.last_name,
                            avatar: userResult[0]?.avatar,
                            role_id: userResult[0].role_id,
                            email: userResult[0]?.email,
                            updated_on: recipient_details?.updated_on,
                            notes: recipient_details?.notes,
                            reason: recipient_details?.reason,
                            replaced_notes: recipient_details?.replaced_notes

                        } : undefined;

                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0]?.user_id,
                            first_name: replacedUserResult[0]?.first_name,
                            last_name: replacedUserResult[0]?.last_name,
                            avatar: replacedUserResult[0]?.avatar,
                            role_id: replacedUserResult[0]?.role_id,
                            email: replacedUserResult[0]?.email,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                            replaced_date_time: recipient_details.replaced_updated_on
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult?.[0]?.user_id,
                            first_name: imporsonateUserResult?.[0]?.first_name,
                            last_name: imporsonateUserResult?.[0]?.last_name,
                            avatar: imporsonateUserResult?.[0]?.avatar,
                            role_id: imporsonateUserResult?.[0]?.role_id,
                            email: imporsonateUserResult?.[0]?.email,
                            updated_on: recipient_details?.updated_on,
                            recipient_type: recipientType?.name || '',
                            behaviour,

                        } : undefined;
                    }
                }

                if (recipientType?.name === "Job Manager") {
                    if (input_values.length > 0) {
                        const userQuery = `
                        SELECT user_id, first_name, last_name, avatar, role_id,email
                        FROM user
                        WHERE user_id = :user_id
                          AND program_id=:program_id    
                            AND status = 'active'
                        LIMIT 1
                    `;
                        let userResult = null;
                        if (existing_replaced_user) {
                            userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: existing_replaced_user, program_id: workflow.program_id },
                            });
                        } else {
                            // If no `existing_replaced_user`, use the first `input_value`
                            userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: manager, program_id: workflow.program_id },
                            });
                        }

                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        if (userResult.length && replaced_by) {
                            replacedUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: replaced_by, program_id: workflow.program_id },
                            });
                        }
                        if (userResult.length && imporsonate_by) {
                            imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: imporsonate_by, program_id: workflow.program_id },
                            });
                        }
                        input_value = userResult[0] ? {
                            id: userResult[0]?.user_id,
                            first_name: userResult[0]?.first_name,
                            last_name: userResult[0]?.last_name,
                            avatar: userResult[0]?.avatar,
                            role_id: userResult[0]?.role_id,
                            email: userResult[0]?.email,
                            updated_on: recipient_details.updated_on,
                            notes: recipient_details.notes,
                            reason: recipient_details.reason,
                            replaced_notes: recipient_details.replaced_notes
                        } : undefined;

                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0]?.user_id,
                            first_name: replacedUserResult[0]?.first_name,
                            last_name: replacedUserResult[0]?.last_name,
                            avatar: replacedUserResult[0]?.avatar,
                            role_id: replacedUserResult[0]?.role_id,
                            email: replacedUserResult[0]?.email,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                            replaced_date_time: recipient_details.replaced_updated_on
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult?.[0]?.user_id,
                            first_name: imporsonateUserResult?.[0]?.first_name,
                            last_name: imporsonateUserResult?.[0]?.last_name,
                            avatar: imporsonateUserResult?.[0]?.avatar,
                            role_id: imporsonateUserResult?.[0]?.role_id,
                            email: imporsonateUserResult?.[0]?.email,
                            updated_on: recipient_details?.updated_on,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                    }
                }

                if (recipientType?.name === "Manager of") {
                    const jobManagerQuery = `
                    SELECT user_id, first_name, last_name, email, avatar, supervisor
                    FROM user
                    WHERE user_id = :job_manager_id
                      AND program_id=:program_id    
                        AND status = 'active'
                    LIMIT 1
                `;


                    const jobManagerResult = await sequelize.query(jobManagerQuery, {
                        type: QueryTypes.SELECT,
                        replacements: { job_manager_id: manager || manager, program_id: workflow.program_id },
                    });


                    if (jobManagerResult.length > 0) {
                        const manager: any = jobManagerResult[0];

                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        let supervisorData = null;
                        if (manager.supervisor) {
                            const supervisorQuery = `
                            SELECT user_id, first_name, last_name, email, avatar
                            FROM user
                            WHERE user_id = :supervisor
                              AND program_id=:program_id    
                             AND status = 'active'
                            LIMIT 1
                        `;
                            let supervisorResult = null
                            // const supervisorResult = await sequelize.query(supervisorQuery, {
                            //     type: QueryTypes.SELECT,
                            //     replacements: { supervisor: manager.supervisor },
                            // });
                            if (existing_replaced_user) {
                                supervisorResult = await sequelize.query(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: existing_replaced_user, program_id: workflow.program_id },
                                });
                            } else {
                                // If no `existing_replaced_user`, use the first `input_value`
                                supervisorResult = await sequelize.query(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: manager.supervisor, program_id: workflow.program_id },
                                });
                            }

                            if (supervisorResult.length && replaced_by) {
                                replacedUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: replaced_by, program_id: workflow.program_id },
                                });
                            }
                            if (supervisorResult.length && imporsonate_by) {
                                imporsonateUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: imporsonate_by, program_id: workflow.program_id },
                                });
                            }

                            if (supervisorResult.length > 0) {
                                const supervisor: any = supervisorResult[0];
                                supervisorData = {
                                    id: supervisor?.user_id,
                                    first_name: supervisor?.first_name,
                                    last_name: supervisor?.last_name,
                                    name: `${supervisor.first_name} ${supervisor.last_name}`.trim(),
                                    email: supervisor?.email,
                                    avatar: supervisor?.avatar || null,
                                    updated_on: recipient_details?.updated_on,
                                    notes: recipient_details?.notes,
                                    reason: recipient_details?.reason,
                                    replaced_notes: recipient_details?.replaced_notes
                                };
                            }
                        }


                        input_value = supervisorData ? [supervisorData] : [];
                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0].user_id,
                            first_name: replacedUserResult[0].first_name,
                            last_name: replacedUserResult[0].last_name,
                            avatar: replacedUserResult[0].avatar || null,
                            email: replacedUserResult[0].email || null,
                            recipient_type: recipientType?.name || "",
                            behaviour,
                            replaced_date_time: recipient_details.replaced_updated_on
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult?.[0]?.user_id,
                            first_name: imporsonateUserResult?.[0]?.first_name,
                            last_name: imporsonateUserResult?.[0]?.last_name,
                            avatar: imporsonateUserResult?.[0]?.avatar,
                            role_id: imporsonateUserResult?.[0]?.role_id,
                            email: imporsonateUserResult?.[0]?.email,
                            updated_on: recipient_details?.updated_on,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                    }
                }
                let imporsonateUserResult = null;
                if (recipientType?.name === "Custom Field Supplied User" || recipientType?.name === "Top of Financial Authority Chain" || recipientType?.name === "Manager of") {
                    // Loop through each placement order
                    for (const level of levels) {
                        let replacedUserResult = null;
                        for (const recipients of level.recipient_types || []) {

                            if (recipients?.meta_data) {
                                if (recipientType?.id == recipients.recipient_type_id) {
                                    const metaData = recipients.meta_data;
                                    // Get the first value from the meta_data (Assuming it is a user ID)
                                    let metaValue = Object.values(metaData)[0];
                                    const userQuery = `
                SELECT user_id, first_name, last_name, email, avatar
                FROM user
                WHERE user_id = :user_id
                 AND program_id=:program_id    
                    AND status = 'active'
                LIMIT 1
            `;
                                    // const userData: any = await sequelize.query<Users>(userQuery, {
                                    //     type: QueryTypes.SELECT,
                                    //     replacements: { user_id: metaValue },
                                    // });
                                    let userData: any = null
                                    if (recipients.existing_replaced_user) {
                                        userData = await sequelize.query(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: recipients.existing_replaced_user, program_id: workflow.program_id },
                                        });
                                    } else {
                                        // If no `existing_replaced_user`, use the first `input_value`
                                        userData = await sequelize.query(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: metaValue, program_id: workflow.program_id },
                                        });
                                    }

                                    if (userData.length && replaced_by) {
                                        replacedUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: replaced_by, program_id: workflow.program_id },
                                        });
                                    }
                                    if (userData.length && imporsonate_by) {
                                        imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: imporsonate_by, program_id: workflow.program_id },
                                        });
                                    }
                                    if (userData.length > 0) {
                                        input_value = {
                                            id: userData[0].user_id,
                                            name: userData[0].first_name,
                                            email: userData[0].email,
                                            avatar: userData[0].avatar,
                                            updated_on: recipient_details.updated_on,
                                            notes: recipient_details.notes,
                                            reason: recipient_details.reason,
                                            replaced_notes: recipient_details.replaced_notes
                                        };
                                    }
                                    replaced_user_data = replacedUserResult ? {
                                        id: replacedUserResult[0].user_id,
                                        first_name: replacedUserResult[0].first_name,
                                        last_name: replacedUserResult[0].last_name,
                                        avatar: replacedUserResult[0].avatar,
                                        role_id: replacedUserResult[0].role_id,
                                        email: replacedUserResult[0].email,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                        replaced_date_time: recipient_details.replaced_updated_on
                                    } : undefined;
                                    imposonate_user_data = imporsonateUserResult ? {
                                        id: imporsonateUserResult?.[0]?.user_id,
                                        first_name: imporsonateUserResult?.[0]?.first_name,
                                        last_name: imporsonateUserResult?.[0]?.last_name,
                                        avatar: imporsonateUserResult?.[0]?.avatar,
                                        role_id: imporsonateUserResult?.[0]?.role_id,
                                        email: imporsonateUserResult?.[0]?.email,
                                        updated_on: recipient_details?.updated_on,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                    } : undefined;

                                }
                            }
                        }
                    }

                }
                let users: any[] = [];
                let level_behaviour: any;
                let receipentstatus: any
                if (recipientType?.name === "Users in Program Role" || recipientType?.name === "Master Data Owner" || recipientType?.name === "Managerial Chain" || recipientType?.name === "Financial Authority Chain") {
                    const recipientTypes = JSON.parse(row.recipient_types);

                    for (const recipient of recipientTypes) {
                        let receipentstatus = recipient.status;

                        if (recipient?.meta_data) {
                            const metaData = recipient.meta_data;
                            let userId = Object.values(metaData)[0]; // Default value to userId from meta_data
                            const level_behaviour = Object.values(metaData)[1];

                            // If existing_replaced_user is present, use that as the userId for fetching the data
                            if (recipient.existing_replaced_user) {
                                userId = recipient.existing_replaced_user; // If existing_replaced_user exists, use that ID
                            }

                            // Fetch the relevant user data (either from meta_data or from existing_replaced_user)
                            const fetchUserData = async (userId: any) => {
                                const user = await fetchLevelUserData(userId, workflow.program_id);
                                return user;
                            };

                            const user = await fetchUserData(userId);

                            if (user) {
                                const userData: any = {
                                    id: user.user_id,
                                    first_name: user.first_name,
                                    last_name: user.last_name,
                                    avatar: user.avatar,
                                    role_id: user.role_id,
                                    email: user.email,
                                    receipentstatus: receipentstatus,
                                    modifiedOn: recipient.updated_on,
                                    level_behaviour: level_behaviour,
                                    replaced_by: null, // Default value
                                    impersonate_by: null, // Default value
                                    // existing_replaced_user: null, // Default value
                                    updated_on: recipient.updated_on,
                                    notes: recipient.notes,
                                    reason: recipient.reason,
                                    actor_first_name: recipient.actor_first_name,
                                    actor_last_name: recipient.actor_last_name,
                                    actor_by_avatar: recipient.actor_by_avatar,
                                    is_admin_override: recipient.is_admin_override,
                                    replaced_notes: recipient.replaced_notes
                                };

                                // Fetch "replaced_by" user data if applicable
                                let replacedByUser = null;
                                if (recipient.replaced_by) {
                                    replacedByUser = await fetchUserData(recipient.replaced_by);
                                    if (replacedByUser) {
                                        userData.replaced_by = {
                                            id: replacedByUser.user_id,
                                            first_name: replacedByUser.first_name,
                                            last_name: replacedByUser.last_name,
                                            email: replacedByUser.email,
                                            avatar: replacedByUser.avatar,
                                            role_id: replacedByUser.role_id,
                                            replaced_notes: recipient.replaced_notes,
                                            replaced_date_time: recipient.replaced_updated_on,
                                            actor_first_name: recipient.actor_first_name,
                                            actor_last_name: recipient.actor_last_name,
                                            actor_by_avatar: recipient.actor_by_avatar,
                                            is_admin_override: recipient.is_admin_override,
                                        };
                                    }
                                }

                                // Fetch "impersonate_by" user data if applicable
                                if (recipient.impersonate_by) {
                                    const impersonatedUser = await fetchUserData(recipient.impersonate_by);


                                    if (impersonatedUser) {
                                        userData.impersonate_by = {
                                            id: impersonatedUser.user_id,
                                            first_name: impersonatedUser.first_name,
                                            last_name: impersonatedUser.last_name,
                                            email: impersonatedUser.email,
                                            avatar: impersonatedUser.avatar,
                                            role_id: impersonatedUser.role_id,
                                            updated_on: recipient_details.updated_on,
                                            impersonate_notes: recipient.impersonate_notes,
                                            impersonate_date_time: recipient.impersonate_updated_on,
                                            actor_first_name: recipient.actor_first_name,
                                            actor_last_name: recipient.actor_last_name,
                                            actor_by_avatar: recipient.actor_by_avatar,
                                            is_admin_override: recipient.is_admin_override,
                                        };
                                    }
                                }



                                // Push the final user data to the users array
                                users.push(userData);
                            }
                        }

                    }

                    // After processing all users, map them to the final input_value format
                    input_value = users.map(user => {
                        return {
                            id: user.id,
                            name: `${user.first_name} ${user.last_name}`.trim(),
                            email: user.email,
                            avatar: user.avatar || null,
                            level_behaviour: user.level_behaviour,
                            replaced_by: user.replaced_by,  // Attach replaced_by data
                            impersonate_by: user.impersonate_by,  // Attach impersonate_by data
                            // existing_replaced_user: user.existing_replaced_user,  // Attach existing_replaced_by data
                            receipentStatus: user.receipentstatus,
                            actor_first_name: user.actor_first_name,
                            actor_last_name: user.actor_last_name,
                            actor_by_avatar: user.actor_by_avatar,
                            is_admin_override: user.is_admin_override,
                            reason: user.reason,
                            updated_on: user.updated_on,
                            notes: user.notes
                        };
                    });
                }
                if (input_value) {
                    let recipients = [];
                    if (Array.isArray(input_value)) {
                        recipients = input_value.map(user => {
                            return {
                                name: getName(user),
                                first_name: user.first_name,
                                last_name: user.last_name,
                                level_id,
                                actor_first_name: user.actor_first_name,
                                actor_last_name: user.actor_last_name,
                                actor_by_avatar: user.actor_by_avatar,
                                is_admin_override: user.is_admin_override,
                                status: user.receipentStatus,
                                updated_on: user.updated_on,
                                notes: user.notes,
                                reason: user.reason,
                                level_behaviour: user.level_behaviour,
                                user_id: user.id,
                                avatar: user.avatar?.url || '',
                                role_id: user.role_id,
                                email: user.email,
                                replaced_by: user.replaced_by,
                                imporsonate_by: imposonate_user_data,
                                // imporsonate_by: user.imposonate_user_data,
                                recipient_type: recipientType?.name || '',
                                behaviour,

                            };
                        });
                    } else {
                        // If input_value is a single object, create a single recipient
                        recipients = [{
                            name: getName(input_value),
                            first_name: input_value.first_name,
                            last_name: input_value.last_name,
                            level_id,
                            status: recipient_status,
                            updated_on: recipient_details.updated_on,
                            notes: recipient_details.notes,
                            reason: recipient_details.reason,
                            replaced_date_time: recipient_details.replaced_updated_on,
                            replaced_notes: recipient_details.replaced_notes,
                            actor_first_name: recipient_details.actor_first_name,
                            actor_last_name: recipient_details.actor_last_name,
                            actor_by_avatar: recipient_details.actor_by_avatar,
                            is_admin_override: recipient_details.is_admin_override,
                            user_id: input_value.id,
                            avatar: input_value.avatar?.url || '',
                            role_id: input_value.role_id,
                            email: input_value.email,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                            replaced_by: replaced_user_data,
                            imporsonate_by: imposonate_user_data
                        }];
                    }

                    // Add the recipients to the workflow levels
                    recipients.forEach(recipient => {
                        const existingLevel = getExistingLevel(workflow, level_id);
                        if (existingLevel) {

                            const duplicateIndex = existingLevel.recipients.findIndex(r => r.user_id === recipient.user_id);

                            if (duplicateIndex === -1) {

                                existingLevel.recipients.push(recipient);
                            }

                        }
                        else {
                            workflow.levels.push({
                                level_id,
                                level_order: placement_order,
                                placement_order,
                                level_status,
                                behaviour,
                                recipients: [recipient],
                            });
                        }
                    });
                }
                // await applyBypassDublicateStatus(request, reply, workflow)
                let data = await statusHandling(request, reply, workflow)
                await updateMissingLevels(levels, workflow)
                // const levelsWithRoles = await getRolesForRecipients(request, reply, workflow.levels, workflow.program_id);
                // workflow.levels = "msp user";



            }
        }
    } catch (error) {
        console.log(error);

        return reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching workflow data.',

        });
    }
};
async function updateMissingLevels(levels: any[], workflow: any) {
    // Extract all placement orders from workflow.levels into a Set
    const workflowPlacementOrders = new Set(workflow.levels.map((level: any) => level.placement_order));

    // Update status for levels where placement_order is NOT in workflowPlacementOrders
    const updatedLevels = levels.map((level: any) => {
        if (!workflowPlacementOrders.has(level.placement_order)) {
            return { ...level, status: "completed" };
        }
        return level;
    });
    for (const updatedLevel of updatedLevels) {
        await JobWorkFlowModel.update(
            { levels: updatedLevels },
            {
                where: {
                    placement_order: updatedLevel.placement_order,
                    id: workflow.job_workflow_id
                }
            }
        );
    }
    // Optionally, return the updated levels or any other information
    return updatedLevels;
}


async function getRolesForRecipients(request: FastifyRequest, reply: FastifyReply, levels: any[], program_id: string) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        for (const level of levels) {

            // Iterate through all recipients in the current level
            for (const recipient of level.recipients) {
                // Get the user_id or replaced_by
                const userId = recipient.replaced_by || recipient.user_id;

                if (!userId) {
                    console.warn(`No user_id or replaced_by found for recipient: ${recipient}`);
                    continue;
                }

                // Fetch user mapping details
                const userMappingQuery = `
                SELECT role_id
                FROM user_mappings
                WHERE user_id = :user_id
                AND program_id = :program_id
                LIMIT 1
            `;
                const userMapping: any = await sequelize.query(userMappingQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { user_id: userId, program_id },
                });

                if (!userMapping.length) {
                    console.warn(`No user mapping found for user_id: ${userId} and program_id: ${program_id}`);
                    continue;
                }

                const role_id = userMapping[0].role_id;

                // Fetch role details from the role table
                const apiUrl = `${AUTH_BASE_URL}/v1/api/roles/${role_id}?tenant-id=${program_id}`;

                const data = {
                    role_id: `${role_id}`
                };
                const response = await axios.post(apiUrl, data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const roleName = response.data.response.roles.display_name;


                // Add roleName to the recipient object
                recipient.roleName = roleName;
            }
        }

        return levels;
    } catch (error) {
        console.error('Error in getRolesForRecipients:', error);
        return reply.status(500).send({ status_code: 500, message: 'role not found' });

    }
}

// const applyBypassDublicateStatus = async (request: FastifyRequest, reply: FastifyReply, workflow: any) => {

//     const traceId = generateCustomUUID();
//     const authHeader = request.headers.authorization;

//     if (!authHeader?.startsWith('Bearer ')) {
//         return reply.status(401).send({ message: 'Unauthorized - Token not found' });
//     }
//     const token = authHeader.split(' ')[1];
//     const user = await decodeToken(token);


//     if (!user) {
//         return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
//     }

//     if (workflow.levels && workflow.levels.length > 0) {
//         const config = {
//             bypass_duplicate_approver: workflow.config.bypass_duplicate_approver,
//             skip_level_if_actor_is_only_approver_in_level: workflow.config.skip_level_if_actor_is_only_approver_in_level, // Assuming the value is true for this scenario
//         };


//         const logged_in_user_id = user.sub;
//         const updates: any[] = [];

//         workflow.levels.forEach((level: any) => {
//             if (level.recipients && level.recipients.length > 0) {
//                 const isOnlyApprover = level.recipients.every(
//                     (recipient: any) => recipient.user_id == "a4370a39-c88a-4567-99f9-8df0b348e5c5"
//                 );


//                 if (config.skip_level_if_actor_is_only_approver_in_level && isOnlyApprover) {
//                     let new_status = "";
//                     if (workflow.workflow_type == "Review") {
//                         new_status = "reviewed";
//                     } else if (workflow.workflow_type == "Approval") {
//                         new_status = "approved";
//                     }
//                     updates.push({
//                         placement_order: level.placement_order,
//                         new_status,
//                         behavior:"ALL",
//                         notes: `Level skipped as user is the only approver for workflow type ${workflow.workflow_type}.`,
//                     });
//                 } 


//                 else {
//                     level.recipients.forEach((recipient: any) => {


//                         if (recipient.user_id == logged_in_user_id) {


//                             if (config.bypass_duplicate_approver) {
//                                 // Prepare the update for each matching recipient
//                                 updates.push({
//                                     placement_order: level.placement_order,
//                                     new_status: "bypassed",
//                                     user_id: logged_in_user_id,
//                                     notes: "Auto-approved due to config and user match.",
//                                 });
//                             }
//                         }
//                     });
//                 }
//             }


//         });

//         if (updates.length > 0) {
//             // Call the `updateWorkflowStatusData` function with the collected updates.
//             await updateWorkflowStatusData(
//                 workflow.program_id,
//                 workflow.job_workflow_id,
//                 updates,
//                 reply
//             );
//         }
//     }
// };
const statusHandling = async (request: FastifyRequest, reply: FastifyReply, workflow: any) => {

    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);


    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }

    // 1. Filter levels with status "pending"
    const levelStatusMap: Record<number, string> = {};
    if (workflow.levels && workflow.levels.length >= 0) {
        const sortedLevels = [...workflow.levels].sort((a, b) => a.placement_order - b.placement_order);
        for (let i = 0; i < sortedLevels.length; i++) {
            const currentLevel = sortedLevels[i];
            const placementOrder = currentLevel.placement_order;
            if (i === 0) {
                currentLevel.level_status = currentLevel.level_status;
            } else {

                const previousLevel = sortedLevels[i - 1];
                if (previousLevel.level_status === "completed" || previousLevel.level_status === "Rejected") {

                    currentLevel.level_status = currentLevel.level_status;
                } else {

                    currentLevel.level_status = "not started";
                }
            }
            if (currentLevel.level_status === "pending") {
                const hasMatchingRecipient =
                    user.userType == "super_user" ||
                    currentLevel.recipients.some((recipient: any) => {
                        const isUserMatched =
                            (recipient.replaced_by && recipient.replaced_by.id === user.sub) ||
                            (!recipient.replaced_by && recipient.user_id === user.sub);  // Fallback to user_id if replaced_by is not present

                        return isUserMatched && recipient.status === "pending";
                    });
                // Ensure `action_allowed` exists in workflow
                if (!workflow.action_allowed) {
                    workflow.action_allowed = {};
                }

                // Set flags based on workflow type
                if (workflow.workflow_type === "Review") {
                    workflow.action_allowed.is_review = hasMatchingRecipient;
                } else if (workflow.workflow_type === "Approval") {
                    workflow.action_allowed.is_approve = hasMatchingRecipient;
                }
            }


            // Update the status map for reference
            levelStatusMap[placementOrder] = currentLevel.level_status;
            // Update the status map for reference
            if (currentLevel.recipients && currentLevel.recipients.length > 0) {
                currentLevel.recipients.forEach((recipient: any) => {
                    if (currentLevel.level_status === "completed" || currentLevel.level_status === "Rejected" || currentLevel.level_status === "Not needed") {
                        // If the level is completed, preserve the recipient's existing status
                        recipient.status = recipient.status;
                    } else if (currentLevel.level_status === "pending") {
                        // If the level is pending, keep the recipient's status as is
                        recipient.status = recipient.status;
                    } else {
                        // If the level is not started, set recipient status to "not started"
                        recipient.status = "not started";
                    }
                });
            }
        }
    }
};
const sendNotificationSequencially = async (request: FastifyRequest, reply: FastifyReply, workflow: any) => {
    const { program_id, job_workflow_id, levels } = workflow;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);


    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    // 1. Filter levels with status "pending"
    const pendingLevels = levels?.filter((level: any) => level.level_status === "pending");

    for (const level of pendingLevels) {
        const placementOrder = level.placement_order;

        // 2. Check if a notification for this placement order already exists
        const existingLog = await sendNotificationModel.findOne({
            where: {
                program_id,
                workflow_id: job_workflow_id,
                placement_order: placementOrder,
            },
        });

        if (existingLog) {
            console.log(`Notification already sent for placement order: ${placementOrder}`);
            continue;
        }

        // 3. Extract recipient emails
        const recipientEmails = level.recipients.map((recipient: any) => ({
            id: recipient.user_id,
            email: recipient.email,
            first_name: recipient.name.split(" ")[0],
            last_name: recipient.name.split(" ").slice(1).join(" "),

        }));

        // 4. Create event code
        const eventCode = await getTriggeredEventsCode(workflow.workflow_type, workflow.event_slug);
        const workflowDetails = await getWorkflowDetails(sequelize, workflow.job_workflow_id);

        let payload;
        if (workflowDetails) {
            const { job_id, first_name, last_name, email, unique_key } = workflowDetails;
            payload = {
                job_id: workflowDetails?.job_id,
                user_type: user?.userType,
                candidate_first_name: workflowDetails?.first_name,
                candidate_last_name: workflowDetails?.last_name,
                submission_id: workflowDetails?.unique_key,
                offer_id: workflowDetails?.offer_code
            }

        } else {
            console.error('workflowDetails is undefined or missing required properties');
        }
        // 5. Create the notification payload

        const notificationPayloads: NotificationDataPayload = {
            program_id,
            traceId,
            eventCode,
            recipientEmail: recipientEmails,
            payload,
            token,
            userId: user?.sub ?? "",
        };

        // 6. Send notifications
        await sendNotification(notificationPayloads);
        console.log("notificationPayloads", notificationPayloads);


        // 7. Log the notification
        await sendNotificationModel.create({
            program_id,
            workflow_id: job_workflow_id,
            placement_order: placementOrder,
            created_by: user.sub,
        });

        console.log(`Notification sent and logged for placement order: ${placementOrder}`);
    }
};

// Function to fetch user data from the database
const fetchLevelUserData = async (userId: any, program_id: any) => {
    const userQuery = `
        SELECT user_id, first_name, last_name, avatar, role_id, email
        FROM user
        WHERE user_id = :user_id  
          AND program_id=:program_id    
         AND status = 'active'
        LIMIT 1
    `;
    const userResult = await sequelize.query<Users>(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { user_id: userId, program_id: program_id },
    });

    if (userResult.length > 0) {
        return userResult[0];  // Return user data
    }

    return null;
};

export async function getUpdateWorkflowApprovals(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);


    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    try {
        const { workflow_action, job_id, workflow_trigger_id, hierarchy_id } = request.query as {
            workflow_action: string;
            job_id: string;
            workflow_trigger_id: string;
            hierarchy_id: any
        };
        let hierarchy_ids = hierarchy_id.split(",").map((id: any) => id.trim());
        const query = `
        SELECT
        w.id As job_workflow_id,
            w.workflow_id AS workflow_id,
             w.event_id AS event_id,
               w.event_title AS event_title,
            w.name AS workflow_name,
            w.flow_type AS workflow_type,
            w.levels,
            w.status,
            w.config,
            w.manager,
            l.id AS level_id,
            l.placement_order AS placement_order,
        r.recipient_type_id,
            r.meta_data,
            r.behaviour,
              e.name,
    e.slug AS event_slug,
            JSON_UNQUOTE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].status'
                    )
                )
            ) AS level_status,

             JSON_UNQUOTE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                )
            ) AS recipient_types,
            (
        SELECT JSON_UNQUOTE(
            JSON_EXTRACT(
                recipient.value, '$.replaced_by'
            )
        )
        FROM JSON_TABLE(
            JSON_EXTRACT(
                w.levels,
                CONCAT(
                    '$[',
                    l.placement_order,
                    '].recipient_types'
                )
            ),
            '$[*]' COLUMNS (
                value JSON PATH '$'
            )
        ) AS recipient
        WHERE JSON_EXTRACT(recipient.value, '$.replaced_by') IS NOT NULL
        LIMIT 1
    ) AS replaced_by,

           JSON_UNQUOTE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                )
            ) AS recipient_types,
            (
        SELECT JSON_UNQUOTE(
            JSON_EXTRACT(
                recipient.value, '$.existing_replaced_user'
            )
        )
        FROM JSON_TABLE(
            JSON_EXTRACT(
                w.levels,
                CONCAT(
                    '$[',
                    l.placement_order,
                    '].recipient_types'
                )
            ),
            '$[*]' COLUMNS (
                value JSON PATH '$'
            )
        ) AS recipient
        WHERE JSON_EXTRACT(recipient.value, '$.existing_replaced_user') IS NOT NULL
        LIMIT 1
    ) AS existing_replaced_user,




JSON_UNQUOTE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                )
            ) AS recipient_types,
            (
        SELECT JSON_UNQUOTE(
            JSON_EXTRACT(
                recipient.value, '$.imporsonate_by'
            )
        )
        FROM JSON_TABLE(
            JSON_EXTRACT(
                w.levels,
                CONCAT(
                    '$[',
                    l.placement_order,
                    '].recipient_types'
                )
            ),
            '$[*]' COLUMNS (
                value JSON PATH '$'
            )
        ) AS recipient
        WHERE JSON_EXTRACT(recipient.value, '$.imporsonate_by') IS NOT NULL
        LIMIT 1
    ) AS imporsonate_by,
(
SELECT JSON_OBJECT(
    'status', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.status')), NULL),
   'updated_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.updated_on')) AS UNSIGNED), NULL),
    'notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.notes')), NULL),
    'reason', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.reason')), NULL),
      'actor_first_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_first_name')), NULL),
          'actor_last_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_last_name')), NULL),
           'actor_by_avatar', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_by_avatar')), NULL),
            'is_admin_override', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.is_admin_override')), NULL),
       
    'replaced_notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_notes')), NULL),
     'replaced_updated_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_updated_on')) AS UNSIGNED), NULL)
)
FROM JSON_TABLE(
    JSON_EXTRACT(
        w.levels,
        CONCAT('$[', l.placement_order, '].recipient_types')
    ),
    '$[*]' COLUMNS (
        value JSON PATH '$'
    )
) AS recipient
WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL 
LIMIT 1
) AS recipient_details,

     (
        SELECT JSON_UNQUOTE(
            JSON_EXTRACT(
                recipient.value, '$.status'
            )
        )
        FROM JSON_TABLE(
            JSON_EXTRACT(
                w.levels,
                CONCAT(
                    '$[',
                    l.placement_order,
                    '].recipient_types'
                )
            ),
            '$[*]' COLUMNS (
                value JSON PATH '$'
            )
        ) AS recipient
        WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL
        LIMIT 1
    ) AS recipient_status
        FROM
            workflow  w
        INNER JOIN workflow_triggered_level l ON l.workflow_id = w.workflow_id AND l.workflow_trigger_id = w.workflow_trigger_id
        LEFT JOIN workflow_triggered_recepient r ON r.level_id = l.id
        LEFT JOIN event e
    ON w.event_id = e.id
     WHERE
w.program_id = :program_id
                AND w.flow_type = :workflow_action
                AND w.workflow_trigger_id = :workflow_trigger_id
                  AND w.is_updated = true
AND JSON_OVERLAPS(w.hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))
ORDER BY       
l.placement_order ASC;`;

        const rows: any[] = await sequelize.query(query, {
            replacements: { workflow_action, program_id, workflow_trigger_id },
            type: QueryTypes.SELECT,
        });

        if (rows.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                message: 'Workflow data not found',
                workflow: [],
                trace_id,
            });
        }
        const workflows: { [key: string]: Workflow } = {};  // Store workflows by job_id


        for (const row of rows) {
            const {
                level_id,
                level_status,
                levels,
                config,
                recipient_status,
                recipient_details,
                placement_order,
                recipient_type_id,
                meta_data,
                behaviour,
                replaced_by,
                existing_replaced_user,
                imporsonate_by,
                job_workflow_id,
            } = row;
            console.log(recipient_type_id);

            let manager = row?.manager
            // Initialize workflow for the job if not already initialized
            if (!workflows[job_workflow_id]) {
                workflows[job_workflow_id] = {
                    program_id: program_id,
                    job_workflow_id: job_workflow_id,
                    workflow_id: row.workflow_id,
                    event_title: row.event_title,
                    workflow_name: row.workflow_name,
                    workflow_type: row.workflow_type,
                    event_slug: row.event_slug,
                    status: row.status,
                    config: row.config,
                    levels: [],
                };
            }

            const workflow = workflows[job_workflow_id];


            let previousLevelCompleted = false;
            // let levelStatusMap: { [key: number]: string } = {};

            if (meta_data && Object.keys(meta_data).length > 0) {
                const recipientTypeQuery = `
                    SELECT id, name
                    FROM recipient_type
                    WHERE id = :recipient_type_id
                     AND is_enabled = true                      
                    LIMIT 1
                `;
                const recipientTypeResult = await sequelize.query(recipientTypeQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { recipient_type_id },
                });


                const recipientType = recipientTypeResult[0] as Recipient;

                let input_value: any;
                let meta_datas = JSON.stringify(meta_data)
                const input_values: any = Object.values(meta_data);
                let replaced_user_data: any
                let imposonate_user_data: any
                if (recipientType?.name === 'Specific User' || recipientType?.name === 'Multiple users' || recipientType?.name === "Job Manager") {
                    if (input_values.length > 0) {
                        const userQuery = `
                        SELECT user_id, first_name, last_name, avatar, role_id,email
                        FROM user
                        WHERE user_id = :user_id
                          AND program_id=:program_id    
                         AND status = 'active'
                          
                        LIMIT 1
                    `;
                        let userResult = null;
                        if (existing_replaced_user) {
                            userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: existing_replaced_user, program_id: workflow.program_id },
                            });
                        } else {
                            // If no `existing_replaced_user`, use the first `input_value`
                            userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: input_values[0], program_id: workflow.program_id },
                            });
                        }

                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        if (userResult.length && replaced_by) {
                            replacedUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: replaced_by, program_id: workflow.program_id },
                            });
                        }
                        if (userResult.length && imporsonate_by) {
                            imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: imporsonate_by, program_id: workflow.program_id },
                            });
                        }
                        input_value = userResult[0] ? {
                            id: userResult[0].user_id,
                            first_name: userResult[0].first_name,
                            last_name: userResult[0].last_name,
                            avatar: userResult[0].avatar,
                            role_id: userResult[0].role_id,
                            email: userResult[0].email,
                            updated_on: recipient_details.updated_on,
                            notes: recipient_details.notes,
                            reason: recipient_details.reason,
                            replaced_notes: recipient_details.replaced_notes
                        } : undefined;

                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0].user_id,
                            first_name: replacedUserResult[0].first_name,
                            last_name: replacedUserResult[0].last_name,
                            avatar: replacedUserResult[0].avatar,
                            role_id: replacedUserResult[0].role_id,
                            email: replacedUserResult[0].email,
                            recipient_type: recipientType?.name || '',
                            replaced_date_time: recipient_details.replaced_updated_on,
                            behaviour,
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult?.[0]?.user_id,
                            first_name: imporsonateUserResult?.[0]?.first_name,
                            last_name: imporsonateUserResult?.[0]?.last_name,
                            avatar: imporsonateUserResult?.[0]?.avatar,
                            role_id: imporsonateUserResult?.[0]?.role_id,
                            email: imporsonateUserResult?.[0]?.email,
                            updated_on: recipient_details?.updated_on,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                    }
                }
                if (recipientType?.name === "Manager of") {
                    const jobManagerQuery = `
                    SELECT user_id, first_name, last_name, email, avatar, supervisor
                    FROM user
                    WHERE user_id = :job_manager_id
                      AND program_id=:program_id    
                      AND status = 'active'
                       
                    LIMIT 1
                `;
                    const jobManagerResult = await sequelize.query(jobManagerQuery, {
                        type: QueryTypes.SELECT,
                        replacements: { job_manager_id: manager || manager, program_id: workflow.program_id },
                    });


                    if (jobManagerResult.length > 0) {
                        const manager: any = jobManagerResult[0];

                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        let supervisorData = null;
                        if (manager.supervisor) {
                            const supervisorQuery = `
                            SELECT user_id, first_name, last_name, email, avatar
                            FROM user
                            WHERE user_id = :supervisor
                            AND is_enabled = true
                              AND program_id=:program_id    
                                AND status = 'active'
                            LIMIT 1
                        `;
                            let supervisorResult = null
                            // const supervisorResult = await sequelize.query(supervisorQuery, {
                            //     type: QueryTypes.SELECT,
                            //     replacements: { supervisor: manager.supervisor },
                            // });
                            if (existing_replaced_user) {
                                supervisorResult = await sequelize.query(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: existing_replaced_user, program_id: workflow.program_id },
                                });
                            } else {
                                // If no `existing_replaced_user`, use the first `input_value`
                                supervisorResult = await sequelize.query(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: manager.supervisor, program_id: workflow.program_id },
                                });
                            }

                            if (supervisorResult.length && replaced_by) {
                                replacedUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: replaced_by, program_id: workflow.program_id },
                                });
                            }
                            if (supervisorResult.length && imporsonate_by) {
                                imporsonateUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: imporsonate_by, program_id: workflow.program_id },
                                });
                            }

                            if (supervisorResult.length > 0) {
                                const supervisor: any = supervisorResult[0];
                                supervisorData = {
                                    id: supervisor.user_id,
                                    name: `${supervisor.first_name} ${supervisor.last_name}`.trim(),
                                    email: supervisor.email,
                                    avatar: supervisor.avatar || null,
                                    updated_on: recipient_details.updated_on,
                                    notes: recipient_details.notes,
                                    reason: recipient_details.reason,
                                    replaced_notes: recipient_details.replaced_notes
                                };
                            }
                        }


                        input_value = supervisorData ? supervisorData : null;
                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0]?.user_id,
                            first_name: replacedUserResult[0]?.first_name,
                            last_name: replacedUserResult[0]?.last_name,
                            avatar: replacedUserResult[0]?.avatar || null,
                            email: replacedUserResult[0]?.email || null,
                            recipient_type: recipientType?.name || "",
                            replaced_date_time: recipient_details.replaced_updated_on,
                            behaviour,
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult?.[0]?.user_id,
                            first_name: imporsonateUserResult?.[0]?.first_name,
                            last_name: imporsonateUserResult?.[0]?.last_name,
                            avatar: imporsonateUserResult?.[0]?.avatar,
                            role_id: imporsonateUserResult?.[0]?.role_id,
                            email: imporsonateUserResult?.[0]?.email,
                            updated_on: recipient_details.updated_on,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                    }
                }
                let imporsonateUserResult = null;
                if (recipientType?.name === "Custom Field Supplied User" || recipientType?.name === "Top of Financial Authority Chain" || recipientType?.name === "Manager of") {
                    console.log(recipientType);

                    // Loop through each placement order
                    for (const level of levels) {

                        let replacedUserResult = null;
                        for (const recipients of level.recipient_types || []) {

                            if (recipients?.meta_data) {
                                if (recipientType?.id == recipients.recipient_type_id) {
                                    const metaData = recipients.meta_data;
                                    // Get the first value from the meta_data (Assuming it is a user ID)
                                    let metaValue = Object.values(metaData)[0];
                                    const userQuery = `
                SELECT user_id, first_name, last_name, email, avatar
                FROM user
                WHERE user_id = :user_id
                  AND program_id=:program_id    
                  AND status = 'active'
                 
                LIMIT 1
            `;

                                    let userData: any = null
                                    if (recipients.existing_replaced_user) {
                                        userData = await sequelize.query(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: recipients.existing_replaced_user, program_id: workflow.program_id },
                                        });
                                    } else {
                                        // If no `existing_replaced_user`, use the first `input_value`
                                        userData = await sequelize.query(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: metaValue, program_id: workflow.program_id },
                                        });
                                    }

                                    if (userData.length && replaced_by) {
                                        replacedUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: replaced_by, program_id: workflow.program_id },
                                        });
                                    }
                                    if (userData.length && imporsonate_by) {
                                        imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: imporsonate_by, program_id: workflow.program_id },
                                        });
                                    }
                                    if (userData.length > 0) {
                                        input_value = {
                                            id: userData[0].user_id,
                                            name: userData[0].first_name,
                                            email: userData[0].email,
                                            avatar: userData[0].avatar,
                                            updated_on: recipient_details.updated_on,
                                            notes: recipient_details.notes,
                                            reason: recipient_details.reason,
                                            replaced_notes: recipient_details.replaced_notes
                                        };
                                    }
                                    replaced_user_data = replacedUserResult ? {
                                        id: replacedUserResult[0]?.user_id,
                                        first_name: replacedUserResult[0]?.first_name,
                                        last_name: replacedUserResult[0]?.last_name,
                                        avatar: replacedUserResult[0]?.avatar,
                                        role_id: replacedUserResult[0]?.role_id,
                                        email: replacedUserResult[0]?.email,
                                        replaced_date_time: recipient_details.replaced_updated_on,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                    } : undefined;
                                    imposonate_user_data = imporsonateUserResult ? {
                                        id: imporsonateUserResult?.[0]?.user_id,
                                        first_name: imporsonateUserResult?.[0]?.first_name,
                                        last_name: imporsonateUserResult?.[0]?.last_name,
                                        avatar: imporsonateUserResult?.[0]?.avatar,
                                        role_id: imporsonateUserResult?.[0]?.role_id,
                                        email: imporsonateUserResult?.[0]?.email,
                                        updated_on: recipient_details.updated_on,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                    } : undefined;

                                }
                            }
                        }
                    }

                }
                let users: any[] = [];
                let level_behaviour: any;
                let receipentstatus: any
                if (recipientType?.name === "Users in Program Role" || recipientType?.name === "Master Data Owner" || recipientType?.name === "Managerial Chain" || recipientType?.name === "Financial Authority Chain") {
                    const recipientTypes = JSON.parse(row.recipient_types);

                    for (const recipient of recipientTypes) {
                        let receipentstatus = recipient.status;

                        if (recipient?.meta_data) {
                            const metaData = recipient.meta_data;
                            let userId = Object.values(metaData)[0]; // Default value to userId from meta_data
                            const level_behaviour = Object.values(metaData)[1];

                            // If existing_replaced_user is present, use that as the userId for fetching the data
                            if (recipient.existing_replaced_user) {
                                userId = recipient.existing_replaced_user; // If existing_replaced_user exists, use that ID
                            }

                            // Fetch the relevant user data (either from meta_data or from existing_replaced_user)
                            const fetchUserData = async (userId: any) => {
                                const user = await fetchLevelUserData(userId, workflow.program_id);
                                return user;
                            };

                            const user = await fetchUserData(userId);

                            if (user) {
                                const userData: any = {
                                    id: user.user_id,
                                    first_name: user.first_name,
                                    last_name: user.last_name,
                                    avatar: user.avatar,
                                    role_id: user.role_id,
                                    email: user.email,
                                    receipentstatus: receipentstatus,
                                    modifiedOn: recipient.updated_on,
                                    level_behaviour: level_behaviour,
                                    replaced_by: null, // Default value
                                    impersonate_by: null, // Default value
                                    // existing_replaced_user: null, // Default value
                                    updated_on: recipient.updated_on,
                                    notes: recipient.notes,
                                    reason: recipient.reason,
                                    actor_first_name: recipient.actor_first_name,
                                    actor_last_name: recipient.actor_last_name,
                                    actor_by_avatar: recipient.actor_by_avatar,
                                    is_admin_override: recipient.is_admin_override,
                                    replaced_notes: recipient.replaced_notes
                                };

                                // Fetch "replaced_by" user data if applicable
                                let replacedByUser = null;
                                if (recipient.replaced_by) {
                                    replacedByUser = await fetchUserData(recipient.replaced_by);
                                    if (replacedByUser) {
                                        userData.replaced_by = {
                                            id: replacedByUser.user_id,
                                            first_name: replacedByUser.first_name,
                                            last_name: replacedByUser.last_name,
                                            email: replacedByUser.email,
                                            avatar: replacedByUser.avatar,
                                            role_id: replacedByUser.role_id,
                                            replaced_notes: recipient.replaced_notes,
                                            replaced_date_time: recipient.replaced_updated_on,
                                            actor_first_name: recipient.actor_first_name,
                                            actor_last_name: recipient.actor_last_name,
                                            actor_by_avatar: recipient.actor_by_avatar,
                                            is_admin_override: recipient.is_admin_override,
                                        };
                                    }
                                }

                                // Fetch "impersonate_by" user data if applicable
                                if (recipient.impersonate_by) {
                                    const impersonatedUser = await fetchUserData(recipient.impersonate_by);


                                    if (impersonatedUser) {
                                        userData.impersonate_by = {
                                            id: impersonatedUser.user_id,
                                            first_name: impersonatedUser.first_name,
                                            last_name: impersonatedUser.last_name,
                                            email: impersonatedUser.email,
                                            avatar: impersonatedUser.avatar,
                                            role_id: impersonatedUser.role_id,
                                            updated_on: recipient_details.updated_on,
                                            impersonate_notes: recipient.impersonate_notes,
                                            impersonate_date_time: recipient.impersonate_updated_on,
                                            actor_first_name: recipient.actor_first_name,
                                            actor_last_name: recipient.actor_last_name,
                                            actor_by_avatar: recipient.actor_by_avatar,
                                            is_admin_override: recipient.is_admin_override,
                                        };
                                    }
                                }



                                // Push the final user data to the users array
                                users.push(userData);
                            }
                        }

                    }

                    // After processing all users, map them to the final input_value format
                    input_value = users.map(user => {
                        return {
                            id: user.id,
                            name: `${user.first_name} ${user.last_name}`.trim(),
                            email: user.email,
                            avatar: user.avatar || null,
                            level_behaviour: user.level_behaviour,
                            replaced_by: user.replaced_by,  // Attach replaced_by data
                            impersonate_by: user.impersonate_by,  // Attach impersonate_by data
                            // existing_replaced_user: user.existing_replaced_user,  // Attach existing_replaced_by data
                            receipentStatus: user.receipentstatus,
                            actor_first_name: user.actor_first_name,
                            actor_last_name: user.actor_last_name,
                            actor_by_avatar: user.actor_by_avatar,
                            is_admin_override: user.is_admin_override,
                            reason: user.reason,
                            updated_on: user.updated_on,
                            notes: user.notes
                        };
                    });
                }
                if (input_value) {
                    let recipients = [];
                    if (Array.isArray(input_value)) {

                        recipients = input_value.map(user => {
                            return {
                                name: getName(user),
                                first_name: user.first_name,
                                last_name: user.last_name,
                                actor_first_name: user.actor_first_name,
                                actor_last_name: user.actor_last_name,
                                actor_by_avatar: user.actor_by_avatar,
                                is_admin_override: user.is_admin_override,
                                updated_on: user.updated_on,
                                level_id,
                                status: user.receipentStatus,
                                // updated_on: user.updated_on,
                                notes: user.notes,
                                reason: user.reason,
                                level_behaviour: user.level_behaviour,
                                user_id: user.id,
                                avatar: user.avatar?.url || '',
                                role_id: user.role_id,
                                email: user.email,
                                replaced_by: user.replaced_by,
                                recipient_type: recipientType?.name || '',
                                behaviour,

                            };
                        });
                    } else {
                        // If input_value is a single object, create a single recipient
                        recipients = [{

                            name: getName(input_value),
                            first_name: input_value.first_name,
                            last_name: input_value.last_name,
                            level_id,
                            status: recipient_status,
                            updated_on: recipient_details.updated_on,
                            notes: recipient_details.notes,
                            reason: recipient_details.reason,
                            replaced_date_time: recipient_details.replaced_updated_on,
                            replaced_notes: recipient_details.replaced_notes,
                            user_id: input_value.id,
                            actor_first_name: recipient_details.actor_first_name,
                            actor_last_name: recipient_details.actor_last_name,
                            actor_by_avatar: recipient_details.actor_by_avatar,
                            is_admin_override: recipient_details.is_admin_override,
                            avatar: input_value.avatar?.url || '',
                            role_id: input_value.role_id,
                            email: input_value.email,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                            replaced_by: replaced_user_data,
                            imporsonate_by: imposonate_user_data
                        }];
                    }

                    // Add the recipients to the workflow levels
                    recipients.forEach(recipient => {
                        const existingLevel = getExistingLevel(workflow, level_id);
                        if (existingLevel) {

                            const duplicateIndex = existingLevel.recipients.findIndex(r => r.user_id === recipient.user_id);

                            if (duplicateIndex === -1) {

                                existingLevel.recipients.push(recipient);
                            }

                        }
                        else {
                            workflow.levels.push({
                                level_id,
                                level_order: placement_order,
                                placement_order,
                                level_status,
                                behaviour,
                                recipients: [recipient],
                            });
                        }
                    });
                }
                // await applyBypassDublicateStatus(request, reply, workflow)
                let data = await statusHandling(request, reply, workflow)
            }
        }
        // Return the workflows object with all workflows aggregated by job_workflow_id
        return reply.status(200).send({
            statusCode: 200,
            workflows: Object.values(workflows),  // Return workflows as an array of objects
            trace_id,
        });

    } catch (error: any) {
        console.log(error);

        return reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching workflow data.',
            trace_id,
        });
    }
}

export const getModuleEvent = async (
    request: FastifyRequest<{ Querystring: { candidate_id: string; job_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const { candidate_id, job_id } = request.query;

    try {
        const workflows = await JobWorkFlowModel.findAll({
            where: {
                candidate_id,
                program_id,
                job_id,
                is_deleted: false,
            },
            attributes: ['workflow_trigger_id'],
            include: [
                {
                    model: Module,
                    as: 'moduleDetail',
                    attributes: ['name'],
                },
                {
                    model: Event,
                    as: 'event',
                    attributes: ['name', 'slug'],
                },
            ],
            order: [['created_on', 'DESC']],
        });

        // Grouping workflows by module name
        const groupedData: Record<string, any[]> = {};

        workflows.forEach((workflow) => {
            const moduleName = workflow.moduleDetail?.name || 'Unknown';
            const eventName = workflow.event?.name || null;
            const eventSlug = workflow.event?.slug || null;

            if (!groupedData[moduleName]) {
                groupedData[moduleName] = [];
            }
            const workflowTriggerId = (workflow as any).workflow_trigger_id;
            // Check if the event is already added to avoid duplicates
            const isDuplicate = groupedData[moduleName].some(
                (event) => event.event === eventName && event.event_slug === eventSlug
            );

            if (!isDuplicate) {
                groupedData[moduleName].push({
                    event: eventName,
                    workflow_trigger_id: workflowTriggerId,
                    event_slug: eventSlug,
                });
            }
        });

        // Transforming grouped data into the required format
        const data = Object.entries(groupedData).map(([moduleName, events]) => ({
            [moduleName]: events,
        }));

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Module and events fetched successfully.',
            data,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            error: error,
        });
    }
};

// export const sendSequencialNotification = async (
//     request: FastifyRequest<{ Params: { program_id: string, job_workflow_id: string } }>,
//     reply: FastifyReply
// ) => {
//     const workflow = request.body as NotificationPayload;
//     console.log(workflow);

//     const traceId = generateCustomUUID();
//     const { program_id, job_workflow_id } = request.params;

//     const authHeader = request.headers.authorization;
//     if (!authHeader?.startsWith('Bearer ')) {
//         return reply.status(401).send({ message: 'Unauthorized - Token not found' });
//     }

//     const token = authHeader.split(' ')[1];
//     const user: any = await decodeToken(token);
//     if (!user) {
//         return reply.status(401).send({ message: "Unauthorized - Invalid token" });
//     }
//     try {
//         let query: any[] = await sequelize.query(`select * from workflow where id=:job_workflow_id;`, {
//             replacements: { job_workflow_id: job_workflow_id },
//             type: QueryTypes.SELECT
//         });
//         let workflowData = query[0]
//         const matchedLevel = workflowData.levels.slice(1).find((level: any) => level.placement_order == workflow.placement_order);
//         console.log(matchedLevel);

//         let userIds: any = []
//         if (matchedLevel?.recipient_types) {
//             userIds = matchedLevel.recipient_types
//                 .flatMap((recipient: any) => Object.values(recipient.meta_data || {}));

//             console.log("Extracted User IDs:", userIds);
//         }
//         const placementOrder = workflowData.placement_order;

//         // 1. Check if the log already exists in send-notification-logs
//         const existingLog = await sendNotificationModel.findOne({
//             where: {
//                 program_id,
//                 workflow_id: job_workflow_id,
//                 placement_order: placementOrder,

//             },
//         });

//         if (existingLog) {
//             return reply.status(200).send({ message: "Notification already sent for this placement order." });
//         }
//         const users = await getUserData(userIds, sequelize);
//         console.log(users);


//         if (!users || users.length === 0) {
//             return reply.status(404).send({ message: "No valid users found for the provided IDs." });
//         }
//         const recipientEmailList: EmailRecipient[] = users.map((user: any) => ({
//             id: user.id,
//             email: user.email,
//             first_name: user.first_name,
//             last_name: user.last_name,
//         }));

//         let eventCode = await getTriggeredEventsCode(workflowData.flow_type, workflowData.events)
//         // 4. Create the notification payload
//         const notificationPayloads: NotificationDataPayload = {
//             program_id,
//             traceId,
//             eventCode: eventCode,
//             recipientEmail: recipientEmailList,
//             payload: {
//                 job_id: workflow.job_id,
//                 user_type: user?.userType,
//             },
//             token,
//             userId: user?.sub ?? "",
//         };

//         // 5. Send notifications
//         await sendNotification(notificationPayloads);
//         console.log("notificationPayloads", notificationPayloads);

//         // 6. Log the notification status
//         await sendNotificationModel.create({
//             program_id,
//             workflow_id: job_workflow_id,
//             placement_order: placementOrder,
//             created_by: user.sub,

//         });
//         reply.status(200).send({ message: "Notification sent successfully and logged." });
//     } catch (error) {

//         console.error(error);
//         reply.status(500).send({
//             status_code: 500,
//             message: 'An error occurred while creating job workflow.',
//             trace_id: traceId,
//             error: (error as any).message,
//         });
//     }
// };

async function getTriggeredEventsCode(flow_type: any, event: any) {
    if (flow_type == "Approval" && event === "create_job") {
        return "JOB_APPROVAL_FIRST";
    } else if (flow_type == "Review" && event === "create_job") {
        return "JOB_REVIEW_FIRST";
    } else if (flow_type == "Review" && event === "update_job") {
        return "JOB_UPDATE_REVIEW";
    } else if (flow_type == "Approval" && event === "update_job") {
        return "JOB_UPDATE_APPROVAL";
    } else if (flow_type == "Review" && event === "create_offer") {
        return "OFFER_REVIEW_FIRST";
    } else if (flow_type == "Approval" && event === "create_offer") {
        return "OFFER_APPROVAL_FIRST";
    } else if (flow_type == "Review" && event === "counter_offer") {
        return "COUNTER_OFFER_REVIEW_FIRST";
    } else if (flow_type == "Approval" && event === "counter_offer") {
        return "COOUTER_OFFER_APPROVAL_FIRST";
    } else if (flow_type == "Approval" && event === "create_assignment") {
        return "ASSIGNMENT_APPROVAL_REQUEST";
    } else if (flow_type == "Approval" && event === "update_assignment") {
        return "ASSIGNMENT_MODIFIED_APPROVAL";
    } else if (flow_type == "Review" && event === "submit_candidate_rehire_check") {
        return "REHIRE_REVIEW";
    } else if (flow_type == "Review" && event === "submit_candidate_rehire_check") {
        return "DO_NOT_REHIRE_REVIEW";
    } else if (flow_type == "Review" && event === "submit_candidate_shortlist") {
        return "CANDIDATE_SHORTLIST_REQUEST_FIRST";
    } else if (flow_type == "Approval" && event === "submit_candidate_rehire_check") {
        return "RE_HIRE_APPROVAL";
    } else if (flow_type == "Approval" && event === "BUDGET_INCREASED" || event === "assignment_budget_adjustment") {
        return "BUDGET_INCREASED_APPROVAL";
    } else if (flow_type == "Approval" && event === "BUDGET_REDUCED" || event === "assignment_budget_adjustment") {
        return "BUDGET_REDUCED_APPROVAL";
    } else {
        throw new Error(`Event code not found for event: ${event}`);
    }

}
async function getUserData(userIds: any[], sequelize: any): Promise<any[]> {
    if (!userIds || userIds.length === 0) {
        return []; // Return empty array if no user IDs are provided
    }

    const userQuery = `
        SELECT 
            id,
            first_name,
            last_name,
            email,
            avatar,
            role_id,
            is_enabled
        FROM 
            user
        WHERE 
            id IN (:userIds)
            AND is_enabled = true
    `;

    try {
        // Fetch all user data matching the provided user IDs
        const users = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { userIds },
        });

        // Map the results into an array of objects
        const userData = users.map((user: any) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            avatar: user.avatar || null,
            role_id: user.role_id,
        }));

        return userData;
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw new Error("Unable to fetch user data.");
    }
}