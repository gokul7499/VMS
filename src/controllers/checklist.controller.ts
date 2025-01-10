import CheckListModel from "../models/checklist.model";
import ChecklistInterface from "../interfaces/checklist.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from "../config/instance";
import { col, fn, Op } from "sequelize";
import Checklist from "../models/checklist.model";
import ChecklistMapping from "../models/checklist-mapping.model";
import ChecklistTaskMapping from "../models/checklist-mapping.model";
import { includes } from "lodash";

export async function createCheckList(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    console.log("inside function")
    const traceId = generateCustomUUID();
    const program_id = request.params.program_id;
    try {
        const { task_category_configs, ...checkListData } = request.body as ChecklistInterface;
        const transaction = await sequelize.transaction();

        try {

            const createdCheckList = await Checklist.create(
                { ...checkListData, program_id },
                { transaction }
            );

            if (Array.isArray(task_category_configs) && task_category_configs.length > 0) {
                const taskCategoryMappings = task_category_configs.map((config) => ({
                    checklist_version_id: createdCheckList.version_id,
                    checklist_entity_id: createdCheckList.entity_id,
                    seq_no: config.seq_no,
                    is_mandatory: config.is_mandatory ?? false,
                    trigger: config.trigger,
                    actor_org_type: config.actor_org_type,
                    actor_role_id: config.actor_role_id,
                    actor_role_name: config.actor_role_name,
                    reviewer_org_type: config.reviewer_org_type,
                    reviewer_role_id: config.reviewer_role_id,
                    reviewer_role_name: config.reviewer_role_name,
                    start_date: config.start_date,
                    due_date: config.due_date,
                    is_enabled: config.is_enabled ?? true,
                    is_deleted: config.is_deleted ?? false,
                    created_by: checkListData.created_by,
                    updated_by: checkListData.updated_by,
                    category_id: config.category_id,
                    category_name: config.category_name,
                    task_entity_id: config.task_entity_id,
                    task_version_id: config.task_version_id,
                    task_name: config.task_name,
                    has_dependency: config.has_dependency ?? false,
                    dependency_task_entity_id: config.dependency_task_entity_id,
                    dependency_task_name: config.dependency_task_name,
                    dependency_category_id: config.dependency_category_id,
                    dependency_category_name: config.dependency_category_name,
                }));

                await ChecklistMapping.bulkCreate(taskCategoryMappings, { transaction });
            }
            await transaction.commit();
            reply.status(201).send({
                status_code: 201,
                message: 'Checklist created successfully',
                checklist: createdCheckList,
                traceId,
            });

        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }
    } catch (error: any) {
        console.log(error)
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating the checklist',
            error: error.message,
            traceId,
        });
    }
}
export async function getChecklistById(
    request: FastifyRequest<{ Params: { entity_id: string; version?: string; } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { entity_id, version } = request.params;
    try {
        const checklistOptions: any = {
            where: {
                entity_id,
                ...(version ? { version } : { latest: true }),
            },
            includes: []
        };
        const checklistData: any = await Checklist.findOne(checklistOptions);
        if (checklistData) {
            const taskOptions: any = {
                where: {
                    checklist_version_id: checklistData.version_id,
                },
            };
            const taskMappings = await ChecklistMapping.findAll(taskOptions);
            const checklistResponse = {
                ...checklistData.dataValues,
                task_category_configs: taskMappings.map((task_category: any) => ({
                    ...task_category.dataValues
                })),
            };
            return reply.status(200).send({
                status_code: 200,
                message: 'Successfully found checklist',
                data: checklistResponse,
                traceId: traceId,
            });
        } else {
            return reply.status(404).send({
                status_code: 404,
                message: 'Checklist not found',
                traceId: traceId,
            });
        }
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            traceId: traceId,
        });
    }
}

export async function updateCheckList(
    request: FastifyRequest<{ Params: { entity_id: string, program_id: string }; Body: ChecklistInterface }>,
    reply: FastifyReply
) {
    const { entity_id, program_id } = request.params;
    const {
        name,
        description,
        is_enabled,
        associations,
        task_category_configs,
        created_by,
        updated_by,
    } = request.body;
    if (!Array.isArray(task_category_configs)) {
        return reply.status(400).send({
            status_code: 400,
            message: '`task_category_configs` must be an array.',
        });
    }
    const transaction = await sequelize.transaction();
    try {
        const existingChecklist = await Checklist.findOne({
            where: { entity_id, is_deleted: false, latest: true },
            attributes: ['version', 'version_id'],
            order: [['version', 'DESC']],
        });
        const newVersion = existingChecklist ? existingChecklist.version + 1 : 1;
        if (existingChecklist) {
            await Checklist.update(
                { latest: false, updated_on: new Date(), updated_by },
                {
                    where: { version_id: existingChecklist.version_id },
                    transaction,
                }
            );
        }
        const newChecklist = await Checklist.create(
            {
                entity_id,
                program_id,
                version: newVersion,
                name,
                description,
                is_enabled,
                pre_checklist_entity_id: existingChecklist?.pre_checklist_entity_id,
                pre_checklist_version: existingChecklist?.pre_checklist_version,
                associations: JSON.stringify(associations),
                previous_version_id: existingChecklist ? existingChecklist.version_id : null,
                latest: true,
                created_by,
                updated_by,
                created_on: new Date(),
                updated_on: new Date(),
            },
            { transaction }
        );
        if (!newChecklist) {
            throw new Error('Failed to create a new checklist version.');
        }
        if (existingChecklist) {
            await ChecklistMapping.update(
                {
                    is_deleted: true,
                    updated_on: new Date(),
                    updated_by,
                },
                {
                    where: {
                        checklist_version_id: existingChecklist.version_id,
                        checklist_entity_id: entity_id,
                    },
                    transaction,
                }
            );
        }
        const taskCategoryMappings = task_category_configs.map((config) => ({
            checklist_version_id: newChecklist.version_id,
            checklist_entity_id: entity_id,
            sequence_number: config.seq_no,
            is_mandatory: config.is_mandatory ?? true,
            configuration: JSON.stringify(config.configuration),
            dependency: config.dependency ? JSON.stringify(config.dependency) : null,
            trigger: config.trigger,
            actor_org_type: config.actor_org_type,
            actor_role_id: config.actor_role_id,
            actor_role_name: config.actor_role_name,
            reviewer_org_type: config.reviewer_org_type,
            reviewer_role_id: config.reviewer_role_id,
            reviewer_role_name: config.reviewer_role_name,
            start_date: config.start_date || null,
            due_date: config.due_date || null,
            category_id: config.category_id,
            category_name: config.category_name,
            task_entity_id: config.task_entity_id,
            task_version_id: config.task_version_id,
            task_name: config.task_name,
            has_dependency: config.has_dependency ?? false,
            dependency_task_entity_id: config.dependency_task_entity_id,
            dependency_category_id: config.dependency_category_id,
            created_by,
            updated_by,
            is_enabled: true,
            is_deleted: false,
            created_on: new Date(),
            updated_on: new Date(),
        }));

        await ChecklistMapping.bulkCreate(taskCategoryMappings, { transaction });
        await transaction.commit();
        return reply.status(200).send({
            status_code: 200,
            message: 'Checklist updated and new version created successfully.',
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error details:', error);
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating the checklist.',
        });
    }
}
export async function deleteCheckList(
    request: FastifyRequest<{ Params: { entity_id: string } }>,
    reply: FastifyReply
) {
    const { entity_id } = request.params;
    const traceId = generateCustomUUID();

    try {
        const checklist = await Checklist.findOne({
            where: { entity_id, is_deleted: false },
        });

        if (!checklist) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Checklist not found',
                traceId: traceId,
            });
        }

        await Checklist.update(
            { is_deleted: true, updated_on: new Date() },
            { where: { entity_id } }
        );

        return reply.status(200).send({
            status_code: 200,
            message: 'Checklist deleted successfully',
            traceId: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            traceId: traceId,
            error,
        });
    }
}

export async function listChecklists(
    request: FastifyRequest<{
        Querystring: {
            name?: string;
        };
        Params: { 
            program_id: string 
        };
    }>,
    reply: FastifyReply
) {
    const { name } = request.query;
    const program_id = request.params.program_id;
    const traceId = generateCustomUUID();
    try {

        const whereConditions: any = {
            latest: true,
            is_enabled: true,
            program_id,
            ...(!name ? {} : {name: { [Op.like]: `%${name}%` }})
        };

        const checklists = await Checklist.findAll({
            where: whereConditions,
            order: [['name', 'ASC']],
            attributes: [
                'name', 'entity_id', 'version', 'version_id'
            ],
        });
        if (!checklists.length) {
            return reply.status(404).send({
                status_code: 404,
                message: 'No checklists found for the given filters.',
                traceId: traceId,
            });
        }
        return reply.status(200).send({
            status_code: 200,
            message: "Successfully fetched checklists for the program",
            data: checklists,
            traceId: traceId,
        });
    } catch (error) {
        console.error('Error while filtering checklists:', error);

        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            traceId: traceId,
            error: {
                message: (error as Error).message || 'An unexpected error occurred.',
                stack: (error as Error).stack || null,
            },
        });
    }
}

export async function filterChecklists(
    request: FastifyRequest<{
        Querystring: {
            task_ids?: string;
            is_enabled?: boolean;
            entity_id?: string;
            name?: string;
            limit?: number;
            page?: number;
        };
        Params: { 
            program_id: string 
        };
    }>,
    reply: FastifyReply
) {
    const {is_enabled, name, limit = 10, page = 1 } = request.query;
    const program_id = request.params.program_id;
    const traceId = generateCustomUUID();

    const offset = (page - 1) * limit;
    try {
        const whereConditions: any = {
            latest: true,
            is_deleted: false,
            program_id,
        }
        if (is_enabled !== undefined) {
            whereConditions.is_enabled = is_enabled;
        }
        if (name !== undefined) {
            whereConditions.name = {
                [Op.like]: `%${name}%`, 
            };
        }

        const checklists = await Checklist.findAndCountAll({
            attributes: [
              'version_id',
              'entity_id',
              'name',
              'description',
              'version',
              'program_id',
              'is_enabled',
              [fn('COUNT', col('checklistTasks.id')), 'task_count']
            ],
            include: [
              {
                model: ChecklistTaskMapping,
                as: 'checklistTasks',
                attributes: [],
                where: {
                  is_deleted: false,
                  is_enabled: true
                },
                required: false
              }
            ],
            where: whereConditions,
            group: [
              'Checklist.version_id',
            ],
            order: [['created_on', 'DESC']],
            limit,
            offset,
            subQuery: false
          });
        console.log(checklists);
        if (!checklists.rows.length) {
            return reply.status(404).send({
                status_code: 404,
                message: 'No checklists found for the given filters.',
                traceId: traceId,
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message:  "Checklists fetched successfully",
            data: checklists.rows.map((checklist: any) => ({...checklist.get()})),
            total_count: checklists.count.length,
            current_page: page,
            traceId: traceId,
        });
    } catch (error) {
        console.error('Error while filtering checklists:', error);

        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            traceId: traceId,
            error: {
                message: (error as Error).message || 'An unexpected error occurred.',
                stack: (error as Error).stack || null,
            },
        });
    }
}