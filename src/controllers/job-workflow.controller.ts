import { FastifyRequest, FastifyReply } from 'fastify';
import JobWorkFlowModel from '../models/job-workflow.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { JobWorkFlow, Recipient, Users, Workflow } from '../interfaces/job-workflow.interface';
import { sequelize } from '../config/instance';
import { QueryTypes } from 'sequelize';
import CustomField from '../models/custom-fields.model';
import WorkflowStatusHistory from '../models/workflow-status-history.model';
import jobModel from '../models/job.model';
import { Module } from '../models/module.model';
import Event from '../models/event.model';
import { decodeToken } from '../middlewares/verifyToken';
import { logger } from '../utility/loggerService';
const source_db = process.env.CONFIG_DB || "`qa_vms_configurators`";
const teai_db = process.env.CONFIG_DB || "`qa_vms_configurators`";
export const createJobWorkFlow = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const workflow = request.body as JobWorkFlow;
    const traceId = generateCustomUUID();
    const { program_id } = request.params;

    const workflowData = {
        ...workflow,
        program_id,
    };
    try {
        const createdWorkflow = await JobWorkFlowModel.create(workflowData);

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: createdWorkflow.id,
            message: 'Workflow created successfully.',
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating job workflow.',
            trace_id: traceId,
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
        | { placement_order: number; new_status: string; user_id?: string; notes?: string; behavior?: string, job_id?: string }
        | { placement_order: number; new_status: string; user_id?: string; notes?: string; behavior?: string, job_id?: string }[];
    }>,
    reply: FastifyReply
) => {

    const traceId = generateCustomUUID();
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
        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }
   let managerData=await getManagerDetails(program_id,id)

        let levels = workflow.levels || [];
        let updatedLevels = false;

        // Iterate over each update
        for (const { placement_order, new_status, user_id, notes, behavior } of updates) {

            const user = await fetchUserById(user_id);
            // Here, you can do any other operations that depend on the fetched user add here notification code
            console.log("user", user)
            let levelFound = false;

            levels = await Promise.all(
                levels.map(async (level: any) => {
                    if (level.placement_order === placement_order) {
                        levelFound = true;
                        updatedLevels = true;

                        const updatedRecipientTypes = await Promise.all(
                            level.recipient_types.map(async (recipient: any) => {
                                if (behavior === "any") {
                                    const history = await WorkflowStatusHistory.create({
                                        job_workflow_id: id,
                                        placement_order,
                                        new_status,
                                        program_id,
                                        notes: notes || "",
                                        created_on: new Date(),
                                        user_id: user_id,
                                    });
                                    // If `behavior: any` is present, mark all recipients as "approved"
                                    return { ...recipient, status: "approved", status_id: history.dataValues.id, modified_on: new Date(), };
                                }

                                if (user_id) {

                                    // If the recipient has a `replaced_by` field, match `user_id` directly
                                    if (recipient.replaced_by && recipient.replaced_by === user_id) {
                                        const history = await WorkflowStatusHistory.create({
                                            job_workflow_id: id,
                                            placement_order,
                                            new_status,
                                            program_id,
                                            notes: notes || "",
                                            created_on: new Date(),
                                            user_id: user_id,
                                        });
                                        return { ...recipient, status: new_status, status_id: history.dataValues.id, modified_on: new Date(), };
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
                                                created_on: new Date(),
                                                user_id: user_id,
                                            });
                                            return { ...recipient, status: new_status, status_id: history.dataValues.id, modified_on: new Date(), };
                                        }
                                    }
                                } else {
                                    // For bulk updates, update all recipients with new status
                                    return { ...recipient, status: new_status, modified_on: new Date(), };
                                }
                                return recipient;
                            })
                        );

                        // Determine the level status
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
                })
            );

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }
        }

        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }

        // Update the workflow with the modified levels array
        await workflow.update({ levels, modified_on: new Date() });

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
async function getManagerDetails(program_id:any, workflowId:any) {
    try {
        // Step 1: Query the workflow table to get the manager ID
        const workflowQuery = `
            SELECT id, manager
            FROM workflow
            WHERE id = :id
            AND is_enabled = true
            LIMIT 1
        `;

        const workflowResult:any = await sequelize.query(workflowQuery, {
            type: QueryTypes.SELECT,
            replacements: { id: workflowId },
        });

        if (workflowResult.length === 0) {
            return { status: 'Error', message: 'Workflow not found or disabled' };
        }

        const managerId = workflowResult[0].manager;

        // Step 2: Query the user table to get the manager details
        const userQuery = `
            SELECT id, name, email, role
            FROM user
            WHERE id = :managerId
            LIMIT 1
        `;

        const userResult = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { managerId },
        });

        if (userResult.length === 0) {
            return { status: 'Error', message: 'Manager not found' };
        }

        return { status: 'Success', data: userResult[0] };
    } catch (error) {
        console.error('Error fetching manager details:', error);
        return { status: 'Error', message: 'An error occurred while fetching manager details', error };
    }
}
export const rejectLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; reason: string; user_id: string; notes?: string, job_id?: string }
        | { placement_order: number; new_status: string; reason: string; user_id: string; notes?: string, job_id?: string }[];
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    let updates = request.body;

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
    let managerData=await getManagerDetails(program_id,id)
    try {
        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

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
                            if (
                                (recipient.replaced_by && recipient.replaced_by === user_id) ||
                                (!recipient.replaced_by &&
                                    recipient.meta_data &&
                                    Object.values(recipient.meta_data).includes(user_id))
                            ) {

                                fetchUserById(user_id).then(user => {
                                    console.log("user", user);
                                    // Here, you can do any other operations that depend on the fetched user add here notification code
                                }).catch(error => {
                                    console.error("Error fetching user", error);
                                });

                                return { ...recipient, status: "rejected", modified_on: new Date(), notes: notes, reason: reason };
                            }


                            return { ...recipient, status: "canceled", modified_on: new Date(), notes: notes, reason: reason };
                        });

                        return {
                            ...level,
                            modified_on: new Date(),
                            status: "completed",
                            recipient_types: updatedRecipientTypes,
                        };
                    }



                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => ({
                        ...recipient,
                        status: "canceled",
                        modified_on: new Date(), notes: notes, reason: reason
                    }));

                    return {
                        ...level,
                        modified_on: new Date(),
                        status: "completed",
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
                created_on: new Date(),
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
        await workflow.update({ levels, is_updated: true, modified_on: new Date() });

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

    // Validate input parameters
    if (!program_id || !id || !placement_order || !status || !replaced_by) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, placement_order, status, and replaced_by are required.",
            trace_id: traceId,
        });
    }

    try {
        let managerData=await getManagerDetails(program_id,id)
        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });
        const user = await fetchUserById(user_id);
        console.log("user", user);
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
                levelFound = true;

                const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                    // Check if replaced_by exists, match directly
                    if (recipient.replaced_by === user_id) {
                        return {
                            ...recipient,
                            status: status,
                            replaced_by,
                            replaced_notes: notes,
                            replaced_modified_on: new Date()
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
                            replaced_modified_on: new Date()
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
                created_on: new Date(),
                user_id: user_id,
            });
        }

        // Update the workflow with the modified levels array
        await workflow.update({ levels, modified_on: new Date() });

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
        SELECT id, first_name, last_name, avatar, role_id,email
        FROM user
        WHERE id = :user_id
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
                created_on: new Date(),
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
        await workflow.update({ levels, modified_on: new Date() });

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
    const { updateData } = request.body as any;

    try {
        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Workflow data not found !',
                trace_id: traceId,
            });
        }

        await workflow.update({ ...updateData, modified_on: new Date() });

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
        notes?: string;
        user_id: string;
        behavior?: string;
    }[],
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    console.log("Updates:", updates);

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

        updates.forEach(({ placement_order, new_status, notes, behavior }) => {
            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order === placement_order) {
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
                        (recipient: any) => recipient.status === "bypassed"
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

        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }

        await workflow.update({ levels, modified_on: new Date() });


    } catch (error) {
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
        // let findJobData: any = await jobModel.findOne({
        //     where: { id: job_id || workflow_trigger_id },
        // });

        // if (!findJobData) {
        //     findJobData = await Assignment.findOne({
        //         where: { uuid: workflow_trigger_id },
        //     });
        // }
        // //     const workflowquery = `
        // //     (
        // //         SELECT *
        // //         FROM ${source_db}.jobs
        // //         WHERE id = :job_id OR id = :workflow_trigger_id
        // //     )
        // //     UNION
        // //     (
        // //         SELECT *
        // //         FROM ${teai_db}.assignments
        // //         WHERE uuid = :workflow_trigger_id
        // //     )
        // //     LIMIT 1;
        // // `;
        // //     const findJobDataDetails: any = await sequelize.query(workflowquery, {
        // //         replacements: {
        // //             job_id: job_id,
        // //             workflow_trigger_id: workflow_trigger_id,

        // //         },
        // //         type: QueryTypes.SELECT,
        // //     });
        // //     let findJobData = findJobDataDetails[0]
        //     console.log(findJobData);

        //     let hierarchy_ids
        //     if (findJobData && findJobData.hierarchy_ids) {
        //         hierarchy_ids = findJobData.hierarchy_ids;
        //     }
        let hierarchy_ids = hierarchy_id.split(",").map((id: any) => id.trim());
        const methodIds = method_id.split(',');
        const query = `
            SELECT
            w.id As job_workflow_id,
                w.workflow_id AS workflow_id,
                 w.event_id AS event_id,
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
        'modified_on', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.modified_on')), NULL),
        'notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.notes')), NULL),
        'reason', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.reason')), NULL),
        'replaced_notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_notes')), NULL),
        'replaced_modified_on', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_modified_on')), NULL)
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


        let manager = rows[0]?.manager
        if (rows.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
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
            event_slug: rows[0].event_slug,
            status: rows[0].status,
            config: rows[0].config,
            levels: [],
        };
        let previousLevelCompleted = false;
        let levelStatusMap: { [key: number]: string } = {};

        for (const row of rows) {
            const { level_id, level_status, levels, config, recipient_status, recipient_details, placement_order, recipient_type_id, meta_data, behaviour, replaced_by, imporsonate_by, event_slug } = row;
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
                let replaced_user_data: any
                let imposonate_user_data: any
                if (recipientType?.name === 'Specific User' || recipientType?.name === 'Multiple users') {
                    if (input_values.length > 0) {
                        const userQuery = `
                            SELECT id, first_name, last_name, avatar, role_id
                            FROM user
                            WHERE id = :user_id
                            AND is_enabled = true
                            LIMIT 1
                        `;
                        let userResult = await sequelize.query<Users>(userQuery, {
                            type: QueryTypes.SELECT,
                            replacements: { user_id: input_values[0] },
                        });
                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        if (userResult.length && replaced_by) {
                            replacedUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: replaced_by },
                            });
                        }
                        if (userResult.length && imporsonate_by) {
                            imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: imporsonate_by },
                            });
                        }


                        input_value = userResult[0] ? {
                            id: userResult[0].id,
                            first_name: userResult[0].first_name,
                            last_name: userResult[0].last_name,
                            avatar: userResult[0].avatar,
                            role_id: userResult[0].role_id,
                        } : undefined;

                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0].id,
                            first_name: replacedUserResult[0].first_name,
                            last_name: replacedUserResult[0].last_name,
                            avatar: replacedUserResult[0].avatar,
                            role_id: replacedUserResult[0].role_id,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult[0].id,
                            first_name: imporsonateUserResult[0].first_name,
                            last_name: imporsonateUserResult[0].last_name,
                            avatar: imporsonateUserResult[0].avatar,
                            role_id: imporsonateUserResult[0].role_id,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                    }
                }
                if (recipientType?.name === "Manager of") {
                    const jobManagerQuery = `
                        SELECT id, first_name, last_name, email, avatar, supervisor
                        FROM user
                        WHERE id = :job_manager_id
                        AND is_enabled = true
                        LIMIT 1
                    `;


                    const jobManagerResult = await sequelize.query(jobManagerQuery, {
                        type: QueryTypes.SELECT,
                        replacements: { job_manager_id: manager || manager },
                    });


                    if (jobManagerResult.length > 0) {
                        const manager: any = jobManagerResult[0];

                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        let supervisorData = null;
                        if (manager.supervisor) {
                            const supervisorQuery = `
                                SELECT id, first_name, last_name, email, avatar
                                FROM user
                                WHERE id = :supervisor
                                AND is_enabled = true
                                LIMIT 1
                            `;
                            const supervisorResult = await sequelize.query(supervisorQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { supervisor: manager.supervisor },
                            });


                            if (supervisorResult.length && replaced_by) {
                                replacedUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: replaced_by },
                                });
                            }
                            if (supervisorResult.length && imporsonate_by) {
                                imporsonateUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: imporsonate_by },
                                });
                            }

                            if (supervisorResult.length > 0) {
                                const supervisor: any = supervisorResult[0];
                                supervisorData = {
                                    id: supervisor.id,
                                    name: `${supervisor.first_name} ${supervisor.last_name}`.trim(),
                                    email: supervisor.email,
                                    avatar: supervisor.avatar || null, // Ensure null if avatar is missing
                                };
                            }
                        }


                        input_value = supervisorData ? [supervisorData] : [];
                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0].id,
                            first_name: replacedUserResult[0].first_name,
                            last_name: replacedUserResult[0].last_name,
                            avatar: replacedUserResult[0].avatar || null,
                            recipient_type: recipientType?.name || "",
                            behaviour,
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult[0].id,
                            first_name: imporsonateUserResult[0].first_name,
                            last_name: imporsonateUserResult[0].last_name,
                            avatar: imporsonateUserResult[0].avatar,
                            role_id: imporsonateUserResult[0].role_id,
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
                    SELECT id, first_name, last_name, email, avatar
                    FROM user
                    WHERE id = :user_id
                    AND is_enabled = true
                    LIMIT 1
                `;
                                    const userData: any = await sequelize.query<Users>(userQuery, {
                                        type: QueryTypes.SELECT,
                                        replacements: { user_id: metaValue },
                                    });
                                    if (userData.length && replaced_by) {
                                        replacedUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: replaced_by },
                                        });
                                    }
                                    if (userData.length && imporsonate_by) {
                                        imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: imporsonate_by },
                                        });
                                    }
                                    if (userData.length > 0) {
                                        input_value = {
                                            id: userData[0].id,
                                            name: userData[0].first_name,
                                            email: userData[0].email,
                                            avatar: userData[0].avatar,
                                        };
                                    }
                                    replaced_user_data = replacedUserResult ? {
                                        id: replacedUserResult[0].id,
                                        first_name: replacedUserResult[0].first_name,
                                        last_name: replacedUserResult[0].last_name,
                                        avatar: replacedUserResult[0].avatar,
                                        role_id: replacedUserResult[0].role_id,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                    } : undefined;
                                    imposonate_user_data = imporsonateUserResult ? {
                                        id: imporsonateUserResult[0].id,
                                        first_name: imporsonateUserResult[0].first_name,
                                        last_name: imporsonateUserResult[0].last_name,
                                        avatar: imporsonateUserResult[0].avatar,
                                        role_id: imporsonateUserResult[0].role_id,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                    } : undefined;

                                }
                            }
                        }
                    }

                }


                let users: any[] = [];
                let level_behaviour: any
                if (recipientType?.name === "Users in Program Role" || recipientType?.name === "Master Data Owner" || recipientType?.name === "Managerial Chain" || recipientType?.name === "Financial Authority Chain") {

                    let replacedUserResult: Users[] | null = null;
                    let imporsonateUserResult: Users[] | null = null;
                    const recipientTypes = JSON.parse(row.recipient_types);

                    for (const recipient of recipientTypes) {


                        if (recipient?.meta_data) {
                            const metaData = recipient.meta_data;
                            const userId = Object.values(metaData)[0];


                            level_behaviour = Object.values(metaData)[1];
                            const userQuery = `
                                SELECT id, first_name, last_name, avatar, role_id, email
                                FROM user
                                WHERE id = :user_id
                                AND is_enabled = true
                                LIMIT 1
                            `;
                            const userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: userId },
                            });


                            // Fetch replacement user data if applicable
                            if (userResult.length && replaced_by) {
                                replacedUserResult = await sequelize.query<Users>(userQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { user_id: replaced_by },
                                });
                            }
                            if (userResult.length && imporsonate_by) {
                                imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { user_id: imporsonate_by },
                                });
                            }

                            if (userResult.length > 0) {
                                userResult.forEach(user => {
                                    users.push({
                                        id: user.id,
                                        first_name: user.first_name,
                                        last_name: user.last_name,
                                        avatar: user.avatar,
                                        role_id: user.role_id,
                                    });
                                });
                            }




                            // Map users to input_value including replaced_user_data when applicable
                            input_value = users.map(user => {
                                replaced_user_data = replacedUserResult && replacedUserResult[0]
                                    ? {
                                        id: replacedUserResult[0].id,
                                        first_name: replacedUserResult[0].first_name,
                                        last_name: replacedUserResult[0].last_name,
                                        avatar: replacedUserResult[0].avatar || null,
                                        recipient_type: recipientType?.name || "",
                                        behaviour: level_behaviour,
                                    }
                                    : undefined;
                                imposonate_user_data = imporsonateUserResult && imporsonateUserResult[0] ? {
                                    id: imporsonateUserResult[0].id,
                                    first_name: imporsonateUserResult[0].first_name,
                                    last_name: imporsonateUserResult[0].last_name,
                                    avatar: imporsonateUserResult[0].avatar,
                                    role_id: imporsonateUserResult[0].role_id,
                                    recipient_type: recipientType?.name || '',
                                    behaviour,
                                } : undefined;
                                return {
                                    id: user.id,
                                    name: `${user.first_name} ${user.last_name}`.trim(),
                                    email: user.email,
                                    avatar: user.avatar || null,
                                    replaced_by: replaced_user_data,
                                    level_behaviour: level_behaviour
                                };
                            });





                        }
                    }
                }

                if (input_value) {

                    let recipients = [];

                    if (Array.isArray(input_value)) {
                        recipients = input_value.map(user => {
                            return {
                                name: getName(user),
                                level_id,
                                status: recipient_status,
                                modified_on: recipient_details.modified_on,
                                notes: recipient_details.notes,
                                reason: recipient_details.reason,
                                replaced_date_time: recipient_details.replaced_modified_on,
                                replaced_notes: recipient_details.replaced_notes,
                                level_behaviour: level_behaviour,
                                user_id: user.id,
                                avatar: user.avatar?.url || '',
                                role_id: user.role_id,
                                recipient_type: recipientType?.name || '',
                                behaviour,
                                replaced_by: replaced_user_data,
                                imporsonate_by: imposonate_user_data
                            };

                        });



                    } else {
                        // If input_value is a single object, create a single recipient
                        recipients = [{
                            name: getName(input_value),
                            level_id,
                            status: recipient_status,
                            modified_on: recipient_details.modified_on,
                            notes: recipient_details.notes,
                            reason: recipient_details.reason,
                            replaced_date_time: recipient_details.replaced_modified_on,
                            replaced_notes: recipient_details.replaced_notes,
                            user_id: input_value.id,
                            avatar: input_value.avatar?.url || '',
                            role_id: input_value.role_id,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                            replaced_by: replaced_user_data,
                            imporsonate_by: imposonate_user_data
                        }];



                    }


                    // Add the recipients to the workflow levels
                    recipients.forEach(recipient => {

                        const existingLevel = getExistingLevel(workflow, level_id);
                        // if (existingLevel) {
                        //     existingLevel.recipients.push(recipient);
                        // }
                        if (existingLevel) {

                            const duplicateIndex = existingLevel.recipients.findIndex(r => r.user_id === recipient.user_id);

                            if (duplicateIndex === -1) {

                                existingLevel.recipients.push(recipient);
                            }

                        } else {


                            workflow.levels.push({
                                level_id,
                                level_order: placement_order,
                                placement_order,
                                level_status,
                                recipients: [recipient],
                            });
                        }
                    });
                }


                if (workflow.levels && workflow.levels.length > 0) {
                    const config = {
                        bypass_duplicate_approver: workflow.config.bypass_duplicate_approver,
                        skip_level_if_actor_is_only_approver_in_level: workflow.config.skip_level_if_actor_is_only_approver_in_level, // Assuming the value is true for this scenario
                    };

                    const logged_in_user_id = user.sub;
                    const updates: any[] = [];

                    workflow.levels.forEach(level => {
                        if (level.recipients && level.recipients.length > 0) {
                            const isOnlyApprover = level.recipients.every(
                                recipient => recipient.user_id === logged_in_user_id
                            );
                            if (config.skip_level_if_actor_is_only_approver_in_level && isOnlyApprover) {

                                let new_status = "";
                                if (workflow.workflow_type === "Review") {
                                    new_status = "reviewed";
                                } else if (workflow.workflow_type === "Approval") {
                                    new_status = "approved";
                                }
                                updates.push({
                                    placement_order: level.placement_order,
                                    new_status,
                                    notes: `Level skipped as user is the only approver for workflow type ${workflow.workflow_type}.`,
                                });
                            } else {
                                level.recipients.forEach(recipient => {


                                    if (recipient.user_id === logged_in_user_id) {


                                        if (config.bypass_duplicate_approver) {
                                            // Prepare the update for each matching recipient
                                            updates.push({
                                                placement_order: level.placement_order,
                                                new_status: "bypassed",
                                                user_id: logged_in_user_id,
                                                notes: "Auto-approved due to config and user match.",
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    });

                    if (updates.length > 0) {
                        // Call the `updateWorkflowStatusData` function with the collected updates.
                        await updateWorkflowStatusData(
                            workflow.program_id,
                            workflow.job_workflow_id,
                            updates,
                            reply
                        );
                    }
                }
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
                            if (previousLevel.level_status === "completed") {

                                currentLevel.level_status = currentLevel.level_status;
                            } else {

                                currentLevel.level_status = "not started";
                            }
                        }

                        // Update the status map for reference
                        levelStatusMap[placementOrder] = currentLevel.level_status;
                    }
                }
            }
        }
        return reply.status(200).send({
            statusCode: 200,
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
        //         const workflowquery = `
        //     (
        //         SELECT *
        //         FROM ${source_db}.jobs
        //         WHERE id = :job_id OR id = :workflow_trigger_id
        //     )
        //     UNION
        //     (
        //         SELECT *
        //         FROM ${teai_db}.assignments
        //         WHERE uuid = :workflow_trigger_id
        //     )
        //     LIMIT 1;
        // `;
        //         const findJobDataDetails: any = await sequelize.query(workflowquery, {
        //             replacements: {
        //                 job_id: job_id,
        //                 workflow_trigger_id: workflow_trigger_id,
        //             },
        //             type: QueryTypes.SELECT,
        //         });
        //         let findJobData = findJobDataDetails[0]
        //         console.log(findJobData);
        //         let hierarchy_ids
        //         if (findJobData && findJobData.hierarchy_ids) {

        //             hierarchy_ids = findJobData.hierarchy_ids;
        //         }
        let hierarchy_ids = hierarchy_id.split(",").map((id: any) => id.trim());
        const query = `
            SELECT
            w.id As job_workflow_id,
                w.workflow_id AS workflow_id,
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
        'modified_on', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.modified_on')), NULL),
        'notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.notes')), NULL),
        'reason', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.reason')), NULL),
        'replaced_notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_notes')), NULL),
        'replaced_modified_on', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_modified_on')), NULL)
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
            INNER JOIN workflow_level l ON l.workflow_id = w.workflow_id
            LEFT JOIN workflow_recepient_type r ON r.level_id = l.id
            LEFT JOIN event e
        ON w.event_id = e.id
            WHERE
                w.program_id = :program_id
                AND w.flow_type = :workflow_action
                AND w.workflow_trigger_id = :workflow_trigger_id
                  AND w.is_updated = true
                AND JSON_OVERLAPS(w.hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))ORDER BY
        l.placement_order ASC
        `;

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
                imporsonate_by,
                job_workflow_id,
            } = row;
            let manager = row?.manager
            // Initialize workflow for the job if not already initialized
            if (!workflows[job_workflow_id]) {
                workflows[job_workflow_id] = {
                    program_id: program_id,
                    job_workflow_id: job_workflow_id,
                    workflow_id: row.workflow_id,
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

                let replaced_user_data: any;
                let imposonate_user_data: any;
                if (recipientType?.name === 'Specific User' || recipientType?.name === 'Multiple users') {
                    if (input_values.length > 0) {
                        const userQuery = `
                            SELECT id, first_name, last_name, avatar, role_id
                            FROM user
                            WHERE id = :user_id
                             AND is_enabled = true
                            LIMIT 1
                        `;
                        let userResult = await sequelize.query<Users>(userQuery, {
                            type: QueryTypes.SELECT,
                            replacements: { user_id: input_values[0] },
                        });


                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        if (userResult.length && replaced_by) {
                            replacedUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: replaced_by },
                            });
                        }
                        if (userResult.length && imporsonate_by) {
                            imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: imporsonate_by },
                            });
                        }


                        input_value = userResult[0] ? {
                            id: userResult[0].id,
                            first_name: userResult[0].first_name,
                            last_name: userResult[0].last_name,
                            avatar: userResult[0].avatar,
                            role_id: userResult[0].role_id,
                        } : undefined;

                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0].id,
                            first_name: replacedUserResult[0].first_name,
                            last_name: replacedUserResult[0].last_name,
                            avatar: replacedUserResult[0].avatar,
                            role_id: replacedUserResult[0].role_id,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult[0].id,
                            first_name: imporsonateUserResult[0].first_name,
                            last_name: imporsonateUserResult[0].last_name,
                            avatar: imporsonateUserResult[0].avatar,
                            role_id: imporsonateUserResult[0].role_id,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                        } : undefined;
                    }
                }
                if (recipientType?.name === "Manager of") {
                    const jobManagerQuery = `
                        SELECT id, first_name, last_name, email, avatar, supervisor
                        FROM user
                        WHERE id = :job_manager_id
                         AND is_enabled = true
                        LIMIT 1
                    `;


                    const jobManagerResult = await sequelize.query(jobManagerQuery, {
                        type: QueryTypes.SELECT,
                        replacements: { job_manager_id: manager },
                    });


                    if (jobManagerResult.length > 0) {
                        const manager: any = jobManagerResult[0];

                        let replacedUserResult = null;
                        let imporsonateUserResult = null;
                        let supervisorData = null;
                        if (manager.supervisor) {
                            const supervisorQuery = `
                                SELECT id, first_name, last_name, email, avatar
                                FROM user
                                WHERE id = :supervisor
                                 AND is_enabled = true
                                LIMIT 1
                            `;
                            const supervisorResult = await sequelize.query(supervisorQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { supervisor: manager.supervisor },
                            });

                            if (supervisorResult.length && replaced_by) {
                                replacedUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: replaced_by },
                                });
                            }
                            if (supervisorResult.length && imporsonate_by) {
                                imporsonateUserResult = await sequelize.query<Users>(supervisorQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { supervisor: imporsonate_by },
                                });
                            }

                            if (supervisorResult.length > 0) {
                                const supervisor: any = supervisorResult[0];
                                supervisorData = {
                                    id: supervisor.id,
                                    name: `${supervisor.first_name} ${supervisor.last_name}`.trim(),
                                    email: supervisor.email,
                                    avatar: supervisor.avatar || null, // Ensure null if avatar is missing
                                };
                            }
                        }


                        input_value = supervisorData ? [supervisorData] : [];
                        replaced_user_data = replacedUserResult ? {
                            id: replacedUserResult[0].id,
                            first_name: replacedUserResult[0].first_name,
                            last_name: replacedUserResult[0].last_name,
                            avatar: replacedUserResult[0].avatar || null,
                            recipient_type: recipientType?.name || "",
                            behaviour,
                        } : undefined;

                        imposonate_user_data = imporsonateUserResult ? {
                            id: imporsonateUserResult[0].id,
                            first_name: imporsonateUserResult[0].first_name,
                            last_name: imporsonateUserResult[0].last_name,
                            avatar: imporsonateUserResult[0].avatar,
                            role_id: imporsonateUserResult[0].role_id,
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
                    SELECT id, first_name, last_name, email, avatar
                    FROM user
                    WHERE id = :user_id
                    AND is_enabled = true
                    LIMIT 1
                `;
                                    const userData: any = await sequelize.query<Users>(userQuery, {
                                        type: QueryTypes.SELECT,
                                        replacements: { user_id: metaValue },
                                    });
                                    if (userData.length && replaced_by) {
                                        replacedUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: replaced_by },
                                        });
                                    }
                                    if (userData.length && imporsonate_by) {
                                        imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                            type: QueryTypes.SELECT,
                                            replacements: { user_id: imporsonate_by },
                                        });
                                    }
                                    if (userData.length > 0) {
                                        input_value = {
                                            id: userData[0].id,
                                            name: userData[0].first_name,
                                            email: userData[0].email,
                                            avatar: userData[0].avatar,
                                        };
                                    }
                                    replaced_user_data = replacedUserResult ? {
                                        id: replacedUserResult[0].id,
                                        first_name: replacedUserResult[0].first_name,
                                        last_name: replacedUserResult[0].last_name,
                                        avatar: replacedUserResult[0].avatar,
                                        role_id: replacedUserResult[0].role_id,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                    } : undefined;
                                    imposonate_user_data = imporsonateUserResult ? {
                                        id: imporsonateUserResult[0].id,
                                        first_name: imporsonateUserResult[0].first_name,
                                        last_name: imporsonateUserResult[0].last_name,
                                        avatar: imporsonateUserResult[0].avatar,
                                        role_id: imporsonateUserResult[0].role_id,
                                        recipient_type: recipientType?.name || '',
                                        behaviour,
                                    } : undefined;

                                }
                            }
                        }
                    }

                }
                let users: any[] = [];
                let level_behaviour: any
                if (recipientType?.name === "Users in Program Role" || recipientType?.name === "Master Data Owner" || recipientType?.name === "Managerial Chain" || recipientType?.name === "Financial Authority Chain") {
                    let replacedUserResult: Users[] | null = null;
                    let imporsonateUserResult: Users[] | null = null;
                    const recipientTypes = JSON.parse(row.recipient_types);
                    for (const recipient of recipientTypes) {
                        if (recipient?.meta_data) {
                            const metaData = recipient.meta_data;
                            const userId = Object.values(metaData)[0];
                            level_behaviour = Object.values(metaData)[1];
                            const userQuery = `
                                SELECT id, first_name, last_name, avatar, role_id, email
                                FROM user
                                WHERE id = :user_id
                                AND is_enabled = true
                                LIMIT 1
                            `;
                            const userResult = await sequelize.query<Users>(userQuery, {
                                type: QueryTypes.SELECT,
                                replacements: { user_id: userId },
                            });
                            // Fetch replacement user data if applicable
                            if (userResult.length && replaced_by) {
                                replacedUserResult = await sequelize.query<Users>(userQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { user_id: replaced_by },
                                });
                            }
                            if (userResult.length && imporsonate_by) {
                                imporsonateUserResult = await sequelize.query<Users>(userQuery, {
                                    type: QueryTypes.SELECT,
                                    replacements: { user_id: imporsonate_by },
                                });
                            }

                            if (userResult.length > 0) {
                                userResult.forEach(user => {
                                    users.push({
                                        id: user.id,
                                        first_name: user.first_name,
                                        last_name: user.last_name,
                                        avatar: user.avatar,
                                        role_id: user.role_id,
                                    });
                                });
                            }

                            // Map users to input_value including replaced_user_data when applicable
                            input_value = users.map(user => {
                                replaced_user_data = replacedUserResult && replacedUserResult[0]
                                    ? {
                                        id: replacedUserResult[0].id,
                                        first_name: replacedUserResult[0].first_name,
                                        last_name: replacedUserResult[0].last_name,
                                        avatar: replacedUserResult[0].avatar || null,
                                        recipient_type: recipientType?.name || "",
                                        behaviour: level_behaviour,
                                    }
                                    : undefined;
                                imposonate_user_data = imporsonateUserResult && imporsonateUserResult[0] ? {
                                    id: imporsonateUserResult[0].id,
                                    first_name: imporsonateUserResult[0].first_name,
                                    last_name: imporsonateUserResult[0].last_name,
                                    avatar: imporsonateUserResult[0].avatar,
                                    role_id: imporsonateUserResult[0].role_id,
                                    recipient_type: recipientType?.name || '',
                                    behaviour,
                                } : undefined;
                                return {
                                    id: user.id,
                                    name: `${user.first_name} ${user.last_name}`.trim(),
                                    email: user.email,
                                    avatar: user.avatar || null,
                                    replaced_by: replaced_user_data,
                                    level_behaviour: level_behaviour
                                };
                            });
                        }
                    }
                }

                if (input_value) {

                    let recipients = [];

                    if (Array.isArray(input_value)) {

                        recipients = input_value.map(user => {
                            return {
                                name: getName(user),
                                level_id,
                                status: recipient_status,
                                modified_on: recipient_details.modified_on,
                                notes: recipient_details.notes,
                                reason: recipient_details.reason,
                                replaced_date_time: recipient_details.replaced_modified_on,
                                replaced_notes: recipient_details.replaced_notes,
                                level_behaviour: level_behaviour,
                                user_id: user.id,
                                avatar: user.avatar?.url || '',
                                role_id: user.role_id,
                                recipient_type: recipientType?.name || '',
                                behaviour,
                                replaced_by: replaced_user_data,
                                imporsonate_by: imposonate_user_data
                            };
                        });
                    } else {
                        // If input_value is a single object, create a single recipient
                        recipients = [{
                            name: getName(input_value),
                            level_id,
                            status: recipient_status,
                            modified_on: recipient_details.modified_on,
                            notes: recipient_details.notes,
                            reason: recipient_details.reason,
                            replaced_date_time: recipient_details.replaced_modified_on,
                            replaced_notes: recipient_details.replaced_notes,
                            user_id: input_value.id,
                            avatar: input_value.avatar?.url || '',
                            role_id: input_value.role_id,
                            recipient_type: recipientType?.name || '',
                            behaviour,
                            replaced_by: replaced_user_data,
                            imporsonate_by: imposonate_user_data
                        }];
                    }

                    // Add the recipients to the workflow levels
                    recipients.forEach(recipient => {
                        const existingLevel = getExistingLevel(workflow, level_id);
                        // if (existingLevel) {
                        //     existingLevel.recipients.push(recipient);
                        // }
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
                                recipients: [recipient],
                            });
                        }
                    });
                }


                if (workflow.levels && workflow.levels.length > 0) {
                    const config = {
                        bypass_duplicate_approver: workflow.config.bypass_duplicate_approver,
                        skip_level_if_actor_is_only_approver_in_level: workflow.config.skip_level_if_actor_is_only_approver_in_level, // Assuming the value is true for this scenario
                    };

                    const logged_in_user_id = user.sub;
                    const updates: any[] = [];

                    workflow.levels.forEach(level => {
                        if (level.recipients && level.recipients.length > 0) {
                            const isOnlyApprover = level.recipients.every(
                                recipient => recipient.user_id === logged_in_user_id
                            );
                            if (config.skip_level_if_actor_is_only_approver_in_level && isOnlyApprover) {

                                let new_status = "";
                                if (workflow.workflow_type === "Review") {
                                    new_status = "reviewed";
                                } else if (workflow.workflow_type === "Approval") {
                                    new_status = "approved";
                                }
                                updates.push({
                                    placement_order: level.placement_order,
                                    new_status,
                                    notes: `Level skipped as user is the only approver for workflow type ${workflow.workflow_type}.`,
                                });
                            } else {
                                level.recipients.forEach(recipient => {


                                    if (recipient.user_id === logged_in_user_id) {


                                        if (config.bypass_duplicate_approver) {
                                            // Prepare the update for each matching recipient
                                            updates.push({
                                                placement_order: level.placement_order,
                                                new_status: "bypassed",
                                                user_id: logged_in_user_id,
                                                notes: "Auto-approved due to config and user match.",
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    });

                    if (updates.length > 0) {
                        // Call the `updateWorkflowStatusData` function with the collected updates.
                        await updateWorkflowStatusData(
                            workflow.program_id,
                            workflow.job_workflow_id,
                            updates,
                            reply
                        );
                    }
                }
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
                            if (previousLevel.level_status === "completed") {

                                currentLevel.level_status = currentLevel.level_status;
                            } else {

                                currentLevel.level_status = "not started";
                            }
                        }

                        // Update the status map for reference
                        levelStatusMap[placementOrder] = currentLevel.level_status;
                    }
                }
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
            if (!groupedData[moduleName]) {
                groupedData[moduleName] = [];
            }

            groupedData[moduleName].push({
                event: workflow.event?.name || null,
                event_slug: workflow.event?.slug || null,
            });
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