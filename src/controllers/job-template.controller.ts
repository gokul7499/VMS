import { FastifyRequest, FastifyReply } from "fastify";
import jobTemplateModel from "../models/job-template.model";
import {
  JobTemplateInterface,
  JobMasterDataInterface,
  JobTempRateTypeInterface,
  JobTemplateQualificationInterface,
  JobTemplateDistSchedule,
  GetJobTemplatesQuery,
} from "../interfaces/job-template.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import jobTemplateQualificationModel from "../models/job-template-qualification.model";
import jobTemplateHierarchyModel from "../models/job-template-hierarchie.model";
import { Op, QueryTypes, Transaction } from "sequelize";
import jobTemplateCustomFieldModel from "../models/job-template-custom-field.model";
import JobTempletRepository from "../hooks/job-template-query"
import { sequelize } from "../config/instance";
import { decodeToken } from "../middlewares/verifyToken";
import { getHierarchieWithChildren } from "../utility/queries";
import { extractFileContent } from "../utility/fileUpload";
import JobMasterDataModel from "../models/job-master-data.model";
const jobTempletRepositories = new JobTempletRepository();

export const getAllJobTemplates = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();

  try {
    const {
      id,
      job_id,
      is_enabled,
      template_name,
      labour_category,
      is_shift_rate,
      primary_hierarchy,
      category,
      page = 1,
      limit = 10,
    } = request.query as GetJobTemplatesQuery;

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
    const offset = (pageNumber - 1) * limitNumber;

    const dynamicConditions: string[] = [];
    const replacements: any = { program_id, limit: limitNumber, offset };

    if (id) {
      dynamicConditions.push(`job_templates.id = :id`);
      replacements.id = id;
    }
    if (job_id) {
      dynamicConditions.push(`job_templates.job_id = :job_id`);
      replacements.job_id = job_id;
    }
    if (is_enabled !== undefined) {
      dynamicConditions.push(`job_templates.is_enabled = :is_enabled`);
      replacements.is_enabled = is_enabled.toString() !== "false";
    }
    if (template_name) {
      dynamicConditions.push(`job_templates.template_name LIKE :template_name`);
      replacements.template_name = `%${template_name}%`;
    }
    if (category) {
      dynamicConditions.push(`job_category.title LIKE :category`);
      replacements.category = `%${category}%`;
    }
    if (labour_category) {
      dynamicConditions.push(`labour_category.id LIKE :labour_category`);
      replacements.labour_category = `%${labour_category}%`;
    }
    if (primary_hierarchy) {
      dynamicConditions.push(`job_templates.primary_hierarchy = :primary_hierarchy`);
      replacements.primary_hierarchy = primary_hierarchy;
    }
    if (is_shift_rate !== undefined) {
      dynamicConditions.push(`job_templates.is_shift_rate = :is_shift_rate`);
      replacements.is_shift_rate = is_shift_rate.toString() !== "false";
    }

    const dynamicConditionsString =
      dynamicConditions.length > 0
        ? `AND ${dynamicConditions.join(" AND ")}`
        : "";

    const jobTemplates = await jobTempletRepositories.getAllJobTemplets(
      program_id,
      dynamicConditionsString,
      replacements,
      limitNumber,
      offset
    ) as any[];

    const totalCount = jobTemplates.length > 0 ? jobTemplates[0].total_count : 0;
    const totalPages = Math.ceil(totalCount / limitNumber);

    reply.status(200).send({
      statusCode: 200,
      trace_id: traceId,
      job_templates: jobTemplates,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total_pages: totalPages,
        total_count: totalCount,
      },
    });
  } catch (error: any) {
    reply.status(500).send({
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
      error: error.message,
    });
  }
};

export async function getJobTemplateById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id, id } = request.params as { program_id: string; id: string };

    const [jobTemplate] = await jobTempletRepositories.getJobTempletById(program_id, id);

    if (!jobTemplate) {
      reply.status(200).send({
        message: "Job Template data not found.",
        trace_id: traceId,
        job_templates: [],
        job_template: null,
      });
      return;
    }
    const transformBooleanFields = (obj: any) => {
      const booleanFields = [
        "is_submission_exceed_max_bill_rate",
        "allow_express_offer",
        "is_qualification_enabled",
        "is_description_editable",
        "is_onboarding_checklist",
        "is_automatic_distribution",
        "is_distribute_final_approval",
        "is_expense_allowed_editable",
        "is_expense_allowed",
        "is_resume_mandatory",
        "allow_user_description",
        "is_checklist_enable",
        "is_deleted",
        "is_enabled",
        "is_background_check",
        "is_tiered_distribute_submit",
        "is_manual_distribute_submit",
        "is_review_configured_or_submit",
        "is_shift_rate",
        "is_description_required",
        "is_description_upload_required",
        "is_country_mandatory",
        "is_address_mandatory",
        "default_expense_value",
        "allow_pre_identified_candidate",
        "resume_mandatory",
        "job_submitted_count",
        "ot_exempt"
      ];
      booleanFields.forEach((field) => {
        if (field in obj) {
          obj[field] = Boolean(obj[field]);
        }
      });
      return obj;
    };

    const transformedJobTemplate = transformBooleanFields(jobTemplate);

    reply.status(200).send({
      statusCode: 200,
      message: "Job template fetched successfully",
      job_template: transformedJobTemplate,
      trace_id: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      message: "An error occurred while fetching job template data.",
      error: error.message,
      trace_id: traceId,
    });
  }
}

export async function createJobTemplate(
  request: FastifyRequest,
  reply: FastifyReply
) {
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
  const userId = user?.sub;
  let transaction: Transaction | null = null;

  try {
    const jobTemplateData = request.body as JobTemplateInterface;
    const jobMasterData = request.body as JobMasterDataInterface;
    const jobRateType = request.body as JobTempRateTypeInterface;
    const jobDistSchedule = request.body as JobTemplateDistSchedule;
    const jobQualification = request.body as JobTemplateQualificationInterface;
    const jobTempCustomField = request.body as jobTemplateCustomFieldModel;

    const { program_id } = request.params as { program_id: string };
    transaction = await sequelize.transaction();
    const program = await jobTempletRepositories.programQuery(program_id)

    if (!program || program.length === 0) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: 'Program with this ID does not exist.',
      });
    }

    const existingTemplate = await jobTemplateModel.findOne({
      where: { template_name: jobTemplateData.template_name, program_id },
      transaction,
    });

    if (existingTemplate) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: 'Job template with this name already exists.',
      });
    }

    const jobTemplate = await jobTemplateModel.create(
      {
        ...jobTemplateData,
        program_id,
        created_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    if (Array.isArray(jobTemplateData.hierarchy)) {
      for (const hierarchyId of jobTemplateData.hierarchy) {
        await jobTemplateHierarchyModel.create(
          {
            job_temp_id: jobTemplate.id,
            hierarchy: hierarchyId,
            program_id: jobTemplate.program_id,
          },
          { transaction }
        );
      }
    }

    if (Array.isArray(jobTempCustomField.custom_fields)) {
      const customFieldPromises = jobTempCustomField.custom_fields.map(
        (field: { id: string; value: string }) =>
          jobTemplateCustomFieldModel.create(
            {
              custom_field_id: field.id,
              value: field.value,
              program_id,
              job_temp_id: jobTemplate.id,
            },
            { transaction }
          )
      );
      await Promise.all(customFieldPromises);
    }

    if (Array.isArray(jobQualification.qualification_types)) {
      const qualificationPromises = jobQualification.qualification_types.map(
        (qualification: {
          qualification_type_id: any;
          is_required: any;
          name: any;
          code: any;
          qualifications: any;
        }) =>
          jobTemplateQualificationModel.create(
            {
              qualification_type_id: qualification.qualification_type_id,
              is_required: qualification.is_required,
              name: qualification.name,
              code: qualification.code,
              qualifications: qualification.qualifications,
              program_id,
              job_temp_id: jobTemplate.id,
            },
            { transaction }
          )
      );
      await Promise.all(qualificationPromises);
    }

    await transaction.commit();

    reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: 'Job template created successfully.',
      id: jobTemplate.id,
    });
  } catch (error: any) {
    if (transaction) {
      await transaction.rollback();
    }
    console.log('Error: ', error, 'trace_id:', traceId);
    reply.status(500).send({
      message: 'Internal Server error.',
      error: error.message,
      trace_id: traceId,
    });
  }
}

export async function updateJobTemplate(
  request: FastifyRequest,
  reply: FastifyReply
) {
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
  const userId = user?.sub;
  try {
    const { program_id, id } = request.params as {
      program_id: string;
      id: string;
    };
    const jobTemplateData = request.body as JobTemplateInterface;
    const jobMasterData = request.body as JobMasterDataInterface;
    const jobRateType = request.body as JobTempRateTypeInterface;
    const jobDistSchedule = request.body as JobTemplateDistSchedule;
    const jobQualification = request.body as JobTemplateQualificationInterface;
    const jobTempCustomField = request.body as jobTemplateCustomFieldModel;

    const jobTemplate = await jobTemplateModel.findOne({
      where: { program_id, id },
    });

    if (!jobTemplate) {
      reply.status(200).send({
        status_code: 200,
        message: "Job Template not found.",
        job_tamplate: [],
        trace_id: traceId,
      });
      return;
    }
    const { template_name, category, level, ...updateData } = jobTemplateData;
    updateData.updated_on = BigInt(Date.now());
    updateData.updated_by = userId;
    await jobTemplate.update(updateData);

    if (jobTemplateData.hierarchy && Array.isArray(jobTemplateData.hierarchy)) {
      const incomingHierarchyIds = jobTemplateData.hierarchy.filter(Boolean);
      const existingHierarchyRecords = await jobTemplateHierarchyModel.findAll({
        where: {
          job_temp_id: jobTemplate.id,
          program_id: jobTemplate.program_id,
        },
      });

      const existingHierarchyIds = existingHierarchyRecords.map((record) => record.hierarchy);
      for (const hierarchyId of incomingHierarchyIds) {
        const existingRecord = existingHierarchyRecords.find((record) => record.hierarchy === hierarchyId);

        if (!existingRecord) {
          await jobTemplateHierarchyModel.create({
            job_temp_id: jobTemplate.id,
            hierarchy: hierarchyId,
            program_id: jobTemplate.program_id,
          });
        }
      }
      const idsToDelete = existingHierarchyIds.filter((id) => !incomingHierarchyIds.includes(id));

      if (idsToDelete.length > 0) {
        await jobTemplateHierarchyModel.destroy({
          where: {
            job_temp_id: jobTemplate.id,
            program_id: jobTemplate.program_id,
            hierarchy: idsToDelete,
          },
        });
      }
    }

    if (jobTempCustomField?.custom_fields) {
      const incomingIds = jobTempCustomField.custom_fields.map((custom_field: { id: any; }) => custom_field.id).filter(Boolean);
      for (const custom_field of jobTempCustomField.custom_fields) {
        const { id, value } = custom_field;
        const existingRecord = await jobTemplateCustomFieldModel.findOne({
          where: {
            program_id: jobTemplate.program_id,
            job_temp_id: jobTemplate.id,
            custom_field_id: id,
          },
        });

        if (existingRecord) {
          await existingRecord.update({ custom_field, value });
        } else {
          await jobTemplateCustomFieldModel.create({
            custom_field_id: id,
            value,
            program_id: jobTemplate.program_id,
            job_temp_id: jobTemplate.id,
          });
        }
      }
      const existingCustomFields = await jobTemplateCustomFieldModel.findAll({
        where: {
          program_id: jobTemplate.program_id,
          job_temp_id: jobTemplate.id,
        },
      });
      const existingIds = existingCustomFields.map((field) => field.custom_field_id);
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        await jobTemplateCustomFieldModel.destroy({
          where: {
            program_id: jobTemplate.program_id,
            job_temp_id: jobTemplate.id,
            custom_field_id: idsToDelete,
          },
        });
      }
    }

    if (jobQualification?.qualification_types) {
      const incomingIds = jobQualification.qualification_types
        .map((qualification_type: { qualification_type_id: any; }) => qualification_type.qualification_type_id)
        .filter(Boolean);

      for (const qualification_type of jobQualification.qualification_types) {
        const { qualification_type_id, ...qualificationData } = qualification_type;

        const existingRecord = await jobTemplateQualificationModel.findOne({
          where: {
            program_id,
            job_temp_id: id,
            qualification_type_id,
          },
        });

        if (existingRecord) {
          await existingRecord.update(qualificationData);
        } else {
          await jobTemplateQualificationModel.create({
            qualification_type_id,
            ...qualificationData,
            program_id,
            job_temp_id: id,
          });
        }
      }

      const existingQualifications = await jobTemplateQualificationModel.findAll({
        where: {
          program_id,
          job_temp_id: id,
        },
      });
      const existingIds = existingQualifications.map((q) => q.qualification_type_id);
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        await jobTemplateQualificationModel.destroy({
          where: {
            program_id,
            job_temp_id: id,
            qualification_type_id: idsToDelete,
          },
        });
      }
    }

    const foundational_data= jobMasterData.foundational_data;
    if (foundational_data && Array.isArray(foundational_data)) {
      await JobMasterDataModel.destroy({
        where: { job_temp_id: id },
      });

      for (const data of foundational_data) {
        const { foundation_data_type_id, foundation_data_id, is_read_only } = data;
        if (!foundation_data_type_id || !foundation_data_id) continue;

        await JobMasterDataModel.create({
          program_id,
          job_temp_id: id,
          foundation_data_type_id,
          foundation_data_id,
          is_read_only,
        });
      }
    }

    reply.status(200).send({
      status_code: 200,
      message: "Job template updated successfully.",
      id,
      trace_id: traceId,
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({
      message: "Internal Server Error.",
      error: (error as any).message,
      trace_id: traceId,
    });
  }
}

export async function deleteJobTemplate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id, id } = request.params as {
      id: string;
      program_id: string;
    };
    const jobtemplate_data = await jobTemplateModel.findOne({
      where: { program_id, id },
    });
    if (jobtemplate_data) {
      await jobTemplateModel.update(
        { is_deleted: true, is_enabled: false },
        { where: { program_id, id } }
      );
      reply.status(204).send({
        status_code: 204,
        message: "Job template deleted successfully.",
        trace_id: traceId,
      });
    } else {
      reply.status(204).send({
        status_code: 204,
        message: "Job template not found.",
        trace_id: traceId,
        job_template: [],
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: "An error occurred while deleting job.",
      trace_id: traceId,
      error: error,
    });
  }
}

export async function getJobTemplatesByHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();

  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, filter_by_hierarchy } = request.body as {
      hierarchy_ids?: string[];
      filter_by_hierarchy?: boolean;
    };

    if (filter_by_hierarchy && (!hierarchy_ids || hierarchy_ids.length === 0)) {
      return reply.status(400).send({
        status_code: 400,
        message: "Hierarchy filtering is enabled, but no hierarchy_ids provided.",
        trace_id: traceId,
      });
    }

    const data = await jobTempletRepositories.getJobTemplateByHierarchies(
        program_id,
        hierarchy_ids,
        filter_by_hierarchy
    );

    return reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id: traceId,
    });
  } catch (error) {
    console.error("Error fetching job templates:", error);
    return reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
    });
  }
}


export async function getAllJobTemplateHierarchyById(request: FastifyRequest, reply: FastifyReply) {
  const trace_id = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, job_type, is_enabled,is_shift_rate } = request.query as { hierarchy_ids: string; job_type: string; is_enabled: string,is_shift_rate?: string; };
    const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];
    const isEnabledBool = is_enabled !== undefined ? is_enabled === "true" : undefined;
    const isShiftRate = is_shift_rate !== undefined ? is_shift_rate === "true" : undefined
    const data = await jobTempletRepositories.getJobTempletByHierarchies(
      program_id,
      hierarchyIdsArray,
      job_type,
      isEnabledBool,
      isShiftRate
    );
    console.log("datat", data)
    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id: trace_id,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: trace_id,
    });
  }
}

export async function getMostUsedJobTemplates(request: FastifyRequest, reply: FastifyReply) {
  const trace_id = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, job_type, limit, offset, is_enabled,is_shift_rate} = request.query as { hierarchy_ids: string; job_type: string; limit: number; offset: number; is_enabled: string,is_shift_rate?: string};
    const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];
    const isEnabledBool = is_enabled !== undefined ? is_enabled === "true" : undefined;
    const isShiftRate = is_shift_rate !== undefined ? is_shift_rate === "true" : undefined
    const data = await jobTempletRepositories.getMostUsedJobTemplatesByProgram(
      program_id,
      hierarchyIdsArray,
      job_type,
      limit,
      offset,
      isEnabledBool,
      isShiftRate
    );

    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id: trace_id,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: trace_id,
    });
  }
}

export async function getAllJobTempletsByHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const {
      hierarchy,
      labour_category,
      job_type,
      name,
      qualification,
      limit,
      offset,
      labour_category_id,
      is_enabled,
      is_shift_rate,
      hierarchy_ids
    } = request.query as {
      hierarchy?: string;
      labour_category?: string;
      job_type?: string;
      name?: string;
      qualification?: string;
      limit?: number;
      offset?: number;
      labour_category_id?: string;
      is_enabled?: string;
      is_shift_rate?: string;
      hierarchy_ids?: string
    };

    const hierarchyIdsArray = hierarchy?.split(",") || [];
    const JobType = job_type?.split(",") || [];
    const laborCategoryIdsArray = labour_category?.split(",") || [];
    const qualificationIdsArray = qualification?.split(",") || [];
    const isEnabledBool = is_enabled !== undefined ? is_enabled === "true" : undefined
    const isShiftRate = is_shift_rate !== undefined ? is_shift_rate === "true" : undefined
    const isHierarchyIdsArray = hierarchy_ids?.split(",") || [];
    const data = await jobTempletRepositories.getAllJobTemplateByHierarchy(
      program_id,
      hierarchyIdsArray,
      laborCategoryIdsArray,
      qualificationIdsArray,
      limit,
      offset,
      JobType,
      name,
      labour_category_id,
      isEnabledBool,
      isShiftRate,
      isHierarchyIdsArray
    );
    if (!data || data.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "No job templates found",
        job_templates: [],
        trace_id: traceId,
      });
    }
    const uniqueJobTemplates = data.map((jobTemplate: any) => {
      const uniqueHierarchies = Array.from(
        new Set(jobTemplate.hierarchy.map((h: any) => JSON.stringify(h)))
      ).map((h: any) => JSON.parse(h));

      return {
        ...jobTemplate,
        hierarchy: uniqueHierarchies,
      };
    });

    reply.status(200).send({
      status_code: 200,
      message: "Job template fetched successfully",
      job_templates: uniqueJobTemplates,
      trace_id: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates hierarchies.",
      trace_id: traceId,
      error: error.message,
    });
  }
}

export async function findJobTemplatesByHierarchyIds(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { hierarchy_ids } = request.body as { hierarchy_ids: string[] };
  try {
    if (
      !Array.isArray(hierarchy_ids) ||
      hierarchy_ids.length === 0 ||
      !hierarchy_ids.every((id) => typeof id === "string" && id.trim() !== "")
    ) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "hierarchy_ids must be a not empty.",
      });
    }

    const jobTemplateHierarchies = await jobTemplateHierarchyModel.findAll({
      where: {
        hierarchy: {
          [Op.in]: hierarchy_ids,
        },
      },
      attributes: ["job_temp_id", "hierarchy"],
    });

    if (jobTemplateHierarchies.length === 0) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "No matching data found for the provided hierarchy IDs.",
      });
    }

    const hierarchyMap = jobTemplateHierarchies.reduce(
      (acc, record) => {
        if (!acc[record.job_temp_id]) {
          acc[record.job_temp_id] = new Set();
        }
        acc[record.job_temp_id].add(record.hierarchy);
        return acc;
      },
      {} as Record<string, Set<string>>
    );

    const matchingJobTemplateIds = Object.keys(hierarchyMap).filter(
      (jobTempId) =>
        hierarchy_ids.every((id) => hierarchyMap[jobTempId].has(id))
    );

    if (matchingJobTemplateIds.length === 0) {
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message:
          "No job templates found that match all provided hierarchy IDs.",
      });
    }

    const jobTemplates = await jobTemplateModel.findAll({
      where: {
        id: {
          [Op.in]: matchingJobTemplateIds,
        },
        program_id,
      },
      attributes: ["program_id", "id", "job_id", "is_enabled", "template_name"],
    });

    const jobTemplatesWithHierarchies = jobTemplates.map((template) => ({
      ...template.toJSON(),
      jobTemplateHierarchies: Array.from(hierarchyMap[template.id]),
    }));
    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      record_count: jobTemplatesWithHierarchies.length,
      job_templates: jobTemplatesWithHierarchies,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server error.",
    });
  }
}

export async function findJobTemplatesByLabourCategories(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { labour_category } = request.query as { labour_category: string };
  const traceId = generateCustomUUID();
  try {
    if (!labour_category) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "Provide labour category in query !",
      });
    }
    const jobTemplates = await jobTemplateModel.findAll({
      where: {
        labour_category: labour_category,
        program_id: program_id
      },
      attributes: ["template_name", "id"]
    });

    if (jobTemplates.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No matching data found for the provided labour category.",
        job_templates: []

      });
    }
    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Matching job templates find successfully !",
      record_count: jobTemplates.length,
      job_templates: jobTemplates,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server error.",
      error: error.message
    });
  }
}

export async function getCommonHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { job_manager_id, job_template_id, sow_template_id } = request.query as {
      job_manager_id: string;
      job_template_id?: string;
      sow_template_id?: string;
    };
    const { program_id } = request.params as { program_id: string };

    if (!job_manager_id) {
      return reply.status(400).send({
        status_code: 400,
        message: "Please provide job_manager_id.",
        trace_id: traceId,
      });
    }

    const managerData = await jobTempletRepositories.managerQuery(job_manager_id, program_id);
    const managerHierarchyIds = managerData.length > 0 ? managerData[0].associate_hierarchy_ids : [];

    let templateHierarchyIds: string[] = [];
    let sowTemplateHierarchyIds: string[] = [];

    if (job_template_id) {
      const templateData = await jobTempletRepositories.templateQuery(job_template_id);
      templateHierarchyIds = templateData.map((row) => row.hierarchy);
    }

    if (sow_template_id) {
      const sowTemplateData = await jobTempletRepositories.sowTemplateQuery(sow_template_id);
      sowTemplateHierarchyIds = sowTemplateData.map((row) => row.hierarchy_id);
    }

    let commonHierarchyIds = managerHierarchyIds;

    if (templateHierarchyIds.length > 0) {
      commonHierarchyIds = commonHierarchyIds.filter((id) => templateHierarchyIds.includes(id));
    }

    if (sowTemplateHierarchyIds.length > 0) {
      commonHierarchyIds = commonHierarchyIds.filter((id) => sowTemplateHierarchyIds.includes(id));
    }

    if (commonHierarchyIds.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        common_hierarchies: [],
        trace_id: traceId,
      });
    }

    const hierarchiesWithChildren = await sequelize.query(getHierarchieWithChildren, {
      replacements: { program_id },
      type: QueryTypes.SELECT
    });

    const buildHierarchy = (data: any, parentId = null) => {
      return data
        .filter((item: any) => item.parent_hierarchy_id === parentId)
        .map((item: any) => {
          const isAssociated = commonHierarchyIds.includes(item.id);
          const children = buildHierarchy(data, item.id);

          if (isAssociated || children.length > 0) {
            return {
              ...item,
              is_associated: isAssociated,
              hierarchies: children
            };
          }

          return null;
        })
        .filter(Boolean);
    };

    const nestedHierarchy = buildHierarchy(hierarchiesWithChildren);

    reply.status(200).send({
      status_code: 200,
      message: "Common hierarchies fetched successfully.",
      trace_id: traceId,
      common_hierarchies: nestedHierarchy,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "An error occurred while fetching common hierarchies.",
      error: error.message
    });
  }
}

export async function uploadFile(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const data = await request.file();

    if (!data) {
      return reply.status(200).send({
        status_code: 200,
        message: "No file uploaded.",
        trace_id: traceId,
      });
    }

    const htmlContent = await extractFileContent(data);

    const htmlResponse = `<html><body>${htmlContent}</body></html>`;

    return reply.status(200).send({
      status_code: 200,
      message: "File uploaded successfully",
      trace_id: traceId,
      data: htmlResponse,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "File upload failed",
      trace_id: traceId,
    });
  }
}

export const advanceFilterJobTemplates = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();

  try {
    const {
      id,
      job_id,
      is_enabled,
      template_name,
      labour_category,
      is_shift_rate,
      primary_hierarchy,
      hierarchy_ids,
      category,
      page = 1,
      limit = 10,
    } = request.body as GetJobTemplatesQuery & { hierarchy_ids?: string[] };

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
    const offset = (pageNumber - 1) * limitNumber;

    const dynamicConditions: string[] = [];
    const replacements: any = { program_id, limit: limitNumber, offset };

    if (id) {
      dynamicConditions.push(`job_templates.id = :id`);
      replacements.id = id;
    }
    if (job_id) {
      dynamicConditions.push(`job_templates.job_id = :job_id`);
      replacements.job_id = job_id;
    }
    if (is_enabled !== undefined) {
      dynamicConditions.push(`job_templates.is_enabled = :is_enabled`);
      replacements.is_enabled = is_enabled.toString() !== "false";
    }
    if (template_name) {
      dynamicConditions.push(`job_templates.template_name LIKE :template_name`);
      replacements.template_name = `%${template_name}%`;
    }
    if (category) {
      dynamicConditions.push(`job_category.title LIKE :category`);
      replacements.category = `%${category}%`;
    }
    if (labour_category) {
      dynamicConditions.push(`labour_category.id LIKE :labour_category`);
      replacements.labour_category = `%${labour_category}%`;
    }
    if (primary_hierarchy) {
      dynamicConditions.push(`job_templates.primary_hierarchy = :primary_hierarchy`);
      replacements.primary_hierarchy = primary_hierarchy;
    }
    if (is_shift_rate !== undefined) {
      dynamicConditions.push(`job_templates.is_shift_rate = :is_shift_rate`);
      replacements.is_shift_rate = is_shift_rate.toString() !== "false";
    }
    if (hierarchy_ids && hierarchy_ids.length > 0) {
      dynamicConditions.push(`
        job_templates.id IN (
          SELECT job_temp_id
          FROM job_template_hierarchies
          WHERE hierarchy IN (:hierarchy_ids)
          AND is_deleted = false
        )
      `);
      replacements.hierarchy_ids = hierarchy_ids;
    }
    

    const dynamicConditionsString =
      dynamicConditions.length > 0 ? `AND ${dynamicConditions.join(" AND ")}` : "";

    const jobTemplates = await jobTempletRepositories.getAllJobTemplets(
      program_id,
      dynamicConditionsString,
      replacements,
      limitNumber,
      offset
    ) as any[];

    const totalCount = jobTemplates.length > 0 ? jobTemplates[0].total_count : 0;
    const totalPages = Math.ceil(totalCount / limitNumber);

    reply.status(200).send({
      statusCode: 200,
      trace_id: traceId,
      job_templates: jobTemplates,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total_pages: totalPages,
        total_count: totalCount,
      },
    });
  } catch (error: any) {
    reply.status(500).send({
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
      error: error.message,
    });
  }
};
