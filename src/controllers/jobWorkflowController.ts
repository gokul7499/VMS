import { FastifyRequest, FastifyReply } from 'fastify';
import JobWorkFlowModel from '../models/jobWorkflowModel';
import generateCustomUUID from '../utility/genrateTraceId';
import { JobWorkFlow, Recipient, Users, Workflow } from '../interfaces/jobWorkflowInterface';
import { sequelize } from '../config/instance';
import { QueryTypes } from 'sequelize';
import FoundationalDataTypes from '../models/foundationalDatatypesModel';
import CustomField from '../models/customFieldsModel';
import RecipientType from '../models/recipientTypesModel';
import WorkflowStatusHistory from '../models/workflowStatusHistoryModel';
import jobModel from '../models/job.model';
import workflowLevelReplace from '../models/workflowLevelReplaceModel'


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
        | { placement_order: number; new_status: string; user_id?: string; notes?: string }
        | { placement_order: number; new_status: string; user_id?: string; notes?: string }[];
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

        let levels = workflow.levels || [];
        let updatedLevels = false;

        // Iterate over each update
        updates.forEach(({ placement_order, new_status, user_id, notes }) => {
            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order === placement_order) {
                    levelFound = true;
                    updatedLevels = true;

                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                        if (user_id) {
                            // If the recipient has a `replaced_by` field, match `user_id` directly
                            if (recipient.replaced_by && recipient.replaced_by === user_id) {
                                return { ...recipient, status: new_status };
                            }

                            // If the recipient does not have `replaced_by`, check `meta_data`
                            if (!recipient.replaced_by && recipient.meta_data) {
                                const matchesUser = Object.values(recipient.meta_data).includes(user_id);
                                if (matchesUser) {
                                    return { ...recipient, status: new_status };
                                }
                            }
                        } else {
                            // For bulk updates, update all recipients with new status
                            return { ...recipient, status: new_status };
                        }
                        return recipient;
                    });

                    // Determine the level status (completed if all are approved)
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

            // Create workflow status history if `user_id` is provided
            if (user_id) {
                WorkflowStatusHistory.create({
                    job_workflow_id: id,
                    placement_order,
                    new_status,
                    program_id,
                    notes: notes || "",
                    created_on: new Date(),
                    user_id: user_id,
                });
            }
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




export const rejectLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; resone: string; user_id: string; notes?: string }
        | { placement_order: number; new_status: string; resone: string; user_id: string; notes?: string }[];
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

        updates.forEach(({ placement_order, new_status, user_id, notes, resone }) => {
            if (new_status !== "rejected") {
                throw new Error("Only 'rejected' status is allowed for this operation.");
            }

            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order >= placement_order) {
                    updatedLevels = true;

                    if (level.placement_order === placement_order) {
                        levelFound = true;
                    }

                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                        // Check `replaced_by` if it exists
                        if (recipient.replaced_by && recipient.replaced_by === user_id) {
                            return { ...recipient, status: "rejected" };
                        }

                        // Check `meta_data` if `replaced_by` does not exist
                        if (
                            !recipient.replaced_by &&
                            recipient.meta_data &&
                            Object.values(recipient.meta_data).includes(user_id)
                        ) {
                            return { ...recipient, status: "rejected" };
                        }

                        // Reject all for levels with `placement_order >= placement_order`
                        if (level.placement_order >= placement_order) {
                            return { ...recipient, status: "rejected" };
                        }

                        return recipient;
                    });

                    return {
                        ...level,
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
                resone,
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



export const updateReplaceLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body: {
            placement_order: number;
            status: string;
            replaced_by: string;
        };
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    const { placement_order, status, replaced_by } = request.body;


    if (!program_id || !id || placement_order === undefined || !status || !replaced_by) {
        return reply.status(400).send({
            status_code: 400,
            message: 'Invalid request: program_id, id, placement_order, status, and replaced_by are required.',
            trace_id: traceId,
        });
    }

    try {

        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Workflow data not found!',
                trace_id: traceId,
            });
        }


        let levels = workflow.levels || [];
        let isUpdated = false;

        // Find and update the matching level
        levels = levels.map((level: any) => {
            if (level.placement_order === placement_order) {
                isUpdated = true;


                const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                    if (recipient.status !== 'replace') {
                        return {
                            ...recipient,
                            status: "replace",
                            replaced_by: replaced_by,
                            meta_data: {
                                ...recipient.meta_data,
                                [Object.keys(recipient.meta_data)[0]]: replaced_by,
                            },
                        };
                    }
                    return recipient;
                });
                return { ...level, recipient_types: updatedRecipientTypes };
            }
            return level;
        });

        if (!isUpdated) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Placement order not found in levels.',
                trace_id: traceId,
            });
        }


        await workflow.update({ levels, modified_on: new Date() });


        await workflowLevelReplace.create({
            workflow_id: workflow.workflow_id,
            placement_order,
            new_status: 'replace',
            program_id,
            replaced_by,
            created_on: new Date(),
        });

        return reply.status(200).send({
            status_code: 200,
            message: 'Job workflow updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Failed to update job workflow.',
            trace_id: traceId,
        });
    }
};

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



export async function getWorkflowForJob(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    try {
        const { method_id, job_id } = request.query as {
            method_id: string;
            job_id: string;
        };
        let findJobData = await jobModel.findOne({ where: { id: job_id } })
        let hierarchy_ids
        if (findJobData && findJobData.hierarchy_ids) {

            hierarchy_ids = findJobData.hierarchy_ids;
        }
        const query = `
            SELECT
            w.id As job_workflow_id,
                w.workflow_id AS workflow_id,
                w.name AS workflow_name,
                w.flow_type AS workflow_type,
                w.levels,
                w.status,
                l.id AS level_id,
                l.placement_order AS placement_order,
                r.recipient_type_id,
                r.meta_data,
                r.behaviour,
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
                job_workflow w
            INNER JOIN workflow_level l ON l.workflow_id = w.workflow_id
            LEFT JOIN workflow_recepient_type r ON r.level_id = l.id
            WHERE
                w.program_id = :program_id
                AND w.method_id = :method_id
                AND w.job_id = :job_id
                AND JSON_OVERLAPS(w.hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))
        `;

        const rows: any[] = await sequelize.query(query, {
            replacements: { method_id, program_id, job_id },
            type: QueryTypes.SELECT,
        });
        console.log(rows);

        if (rows.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                message: 'Workflow data not found',
                workflow: [],
                trace_id,
            });
        }

        const workflow: Workflow = {
            job_workflow_id: rows[0].job_workflow_id,
            workflow_id: rows[0].workflow_id,
            workflow_name: rows[0].workflow_name,
            workflow_type: rows[0].workflow_type,
            status: rows[0].status,
            levels: [],
        };

        for (const row of rows) {
            const { level_id, level_status, recipient_status, placement_order, recipient_type_id, meta_data, behaviour, replaced_by, imporsonate_by } = row;

            if (meta_data && Object.keys(meta_data).length > 0) {
                const recipientTypeQuery = `
                    SELECT name
                    FROM recipientType
                    WHERE id = :recipient_type_id
                    LIMIT 1
                `;
                const recipientTypeResult = await sequelize.query(recipientTypeQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { recipient_type_id },
                });

                const recipientType = recipientTypeResult[0] as Recipient;

                let input_value: any;
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
                let replaced_user_data
                let imposonate_user_data
                // Handling different recipient types
                if (recipientType?.name === 'Specific User' || recipientType?.name === 'Multiple users' || recipientType?.name === 'Single user') {
                    if (input_values.length > 0) {
                        const userQuery = `
                            SELECT id, first_name, last_name, avatar, role_id
                            FROM user
                            WHERE id = :user_id
                            LIMIT 1
                        `;
                        let userResult = await sequelize.query<Users>(userQuery, {
                            type: QueryTypes.SELECT,
                            replacements: { user_id: input_values[0] },
                        });
                        let replacedUserResult = null;
                        let imporsonateUserResult = null;

                        // Fetch replaced user data if available
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

                        console.log("User Result:", userResult);
                        console.log("Replaced User Result:", replacedUserResult);
                        console.log("Replaced User Result:", imporsonateUserResult);


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

                if (["Top of Financial Authority Chain", "Financial Authority Chain", "Managerial Chain", "Manager of"].includes(recipientType?.name)) {
                    const specificRecipientType = await RecipientType.findOne({
                        where: { name: recipientType?.name, program_id }
                    });

                    if (specificRecipientType) {
                        const fieldConfigs = specificRecipientType.parameter_schema?.field_configs || [];
                        fieldConfigs.forEach((config: any) => {
                            const children = config.children || [];
                            const matchingChild = children.find((child: { id: any }) => child.id === input_values);
                            if (matchingChild) {
                                input_value = {
                                    id: matchingChild.id,
                                    name: matchingChild.field?.name || ''
                                } as any;
                            }
                        });
                    }
                }

                if (recipientType?.name === "Custom Field Supplied User") {
                    input_value = await CustomField.findOne({
                        where: { id: input_values },
                        attributes: ["id", "name"]
                    });
                }

                if (recipientType?.name === "Master Data Owner") {
                    input_value = await FoundationalDataTypes.findOne({
                        where: { id: input_values },
                        attributes: ["id", "name"]
                    });
                }

                if (input_value) {
                    const existingLevel = getExistingLevel(workflow, level_id);
                    const recipient = {
                        name: getName(input_value),
                        level_id,
                        status: recipient_status,
                        user_id: input_value.id,
                        avatar: input_value.avatar?.url || '',
                        role_id: input_value.role_id,
                        recipient_type: recipientType?.name || '',
                        behaviour,
                        replaced_by: replaced_user_data,
                        imporsonate_by:imposonate_user_data
                    };
                    if (existingLevel) {
                        existingLevel.recipients.push(recipient);
                    } else {
                        workflow.levels.push({
                            level_id,
                            placement_order,
                            level_status,
                            recipients: [recipient],
                        });
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
    try {

        const { workflow_action, job_id } = request.query as {
            workflow_action: string;
            job_id: string;

        };
        let findJobData = await jobModel.findOne({ where: { id: job_id } })
        console.log(findJobData);

        let hierarchy_ids
        console.log(hierarchy_ids);

        if (findJobData && findJobData.hierarchy_ids) {

            hierarchy_ids = findJobData.hierarchy_ids;
        }
        console.log(hierarchy_ids);
        const query = `
            SELECT
            w.id As job_workflow_id,
                w.workflow_id AS workflow_id,
                w.name AS workflow_name,
                w.flow_type AS workflow_type,
                w.levels,
                w.status,
                l.id AS level_id,
                l.placement_order AS placement_order,
                r.recipient_type_id,
                r.meta_data,
                r.behaviour,
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
                job_workflow w
            INNER JOIN workflow_level l ON l.workflow_id = w.workflow_id
            LEFT JOIN workflow_recepient_type r ON r.level_id = l.id
            WHERE
                w.program_id = :program_id
                AND w.flow_type = :workflow_action
                AND w.job_id = :job_id
                  AND w.is_updated = true
                AND JSON_OVERLAPS(w.hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))
        `;

        const rows: any[] = await sequelize.query(query, {
            replacements: { workflow_action, program_id, job_id },
            type: QueryTypes.SELECT,
        });
        console.log(rows);

        if (rows.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                message: 'Workflow data not found',
                workflow: [],
                trace_id,
            });
        }

        const workflow: Workflow = {
            job_workflow_id: rows[0].job_workflow_id,
            workflow_id: rows[0].workflow_id,
            workflow_name: rows[0].workflow_name,
            workflow_type: rows[0].workflow_type,
            status: rows[0].status,
            levels: [],
        };

        for (const row of rows) {
            const { level_id, level_status, recipient_status, placement_order, recipient_type_id, meta_data, behaviour, replaced_by,imporsonate_by } = row;

            if (meta_data && Object.keys(meta_data).length > 0) {
                const recipientTypeQuery = `
                    SELECT name
                    FROM recipientType
                    WHERE id = :recipient_type_id
                    LIMIT 1
                `;
                const recipientTypeResult = await sequelize.query(recipientTypeQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { recipient_type_id },
                });

                const recipientType = recipientTypeResult[0] as Recipient;

                let input_value: any;
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
                let replaced_user_data
                let imposonate_user_data
                // Handling different recipient types
                if (recipientType?.name === 'Specific User' || recipientType?.name === 'Multiple users' || recipientType?.name === 'Single user') {
                    if (input_values.length > 0) {
                        const userQuery = `
                            SELECT id, first_name, last_name, avatar, role_id
                            FROM user
                            WHERE id = :user_id
                            LIMIT 1
                        `;
                        let userResult = await sequelize.query<Users>(userQuery, {
                            type: QueryTypes.SELECT,
                            replacements: { user_id: input_values[0] },
                        });
                        let replacedUserResult = null;
                        let imporsonateUserResult=null

                        // Fetch replaced user data if available
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
                        console.log("User Result:", userResult);
                        console.log("Replaced User Result:", replacedUserResult);
                        console.log("imporsonate User Result:", imporsonateUserResult);


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

                if (["Top of Financial Authority Chain", "Financial Authority Chain", "Managerial Chain", "Manager of"].includes(recipientType?.name)) {
                    const specificRecipientType = await RecipientType.findOne({
                        where: { name: recipientType?.name, program_id }
                    });

                    if (specificRecipientType) {
                        const fieldConfigs = specificRecipientType.parameter_schema?.field_configs || [];
                        fieldConfigs.forEach((config: any) => {
                            const children = config.children || [];
                            const matchingChild = children.find((child: { id: any }) => child.id === input_values);
                            if (matchingChild) {
                                input_value = {
                                    id: matchingChild.id,
                                    name: matchingChild.field?.name || ''
                                } as any;
                            }
                        });
                    }
                }

                if (recipientType?.name === "Custom Field Supplied User") {
                    input_value = await CustomField.findOne({
                        where: { id: input_values },
                        attributes: ["id", "name"]
                    });
                }

                if (recipientType?.name === "Master Data Owner") {
                    input_value = await FoundationalDataTypes.findOne({
                        where: { id: input_values },
                        attributes: ["id", "name"]
                    });
                }

                if (input_value) {
                    const existingLevel = getExistingLevel(workflow, level_id);
                    const recipient = {
                        name: getName(input_value),
                        level_id,
                        status: recipient_status,
                        user_id: input_value.id,
                        avatar: input_value.avatar?.url || '',
                        role_id: input_value.role_id,
                        recipient_type: recipientType?.name || '',
                        behaviour,
                        replaced_by: replaced_user_data,
                        imporsonate_by:imposonate_user_data
                    };
                    if (existingLevel) {
                        existingLevel.recipients.push(recipient);
                    } else {
                        workflow.levels.push({
                            level_id,
                            placement_order,
                            level_status,
                            recipients: [recipient],
                        });
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