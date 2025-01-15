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
import jobTempRateTypeModel from "../models/job-temp-rate-type.model";
import jobTemplateQualificationModel from "../models/job-template-qualification.model";
import jobTemplateHierarchyModel from "../models/job-template-hierarchie.model";
import JobTemplateDistScheduleModel from "../models/job-template-dist-schedule.model";
import jobMasterDataModel from "../models/job-master-data.model";
import { generateJobTemplateCode } from "../hooks/jobTemplateCodeGenerate";
import { Op, QueryTypes, Transaction } from "sequelize";
// import { extractFileContent } from "../utility/fileUpload";
import jobTemplateCustomFieldModel from "../models/job-template-custom-field.model";
import JobTempletRepository from "../hooks/job-template-query"
import { sequelize } from "../config/instance";
import { decodeToken } from "../middlewares/verifyToken";
import { getHierarchieWithChildren } from "../utility/queries";
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
      category,
      page = 1, // Default value for page
      limit = 10, // Default value for limit
    } = request.query as GetJobTemplatesQuery;

    // Parse page and limit as numbers, ensuring valid values
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
      dynamicConditions.push(`labour_category.name LIKE :labour_category`);
      replacements.labour_category = `%${labour_category}%`;
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



export async function getJobTemplateById(
  request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id, id } = request.params;

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
        "is_tiered_distribute_schedule",
        "is_manual_distribution_job_submit",
        "is_automatic_distribute_submit",
        "is_automatic_distribute_final_approval",
        "is_expense_allowed_editable",
        "is_expense_allowed",
        "is_resume_mandatory",
        "allow_user_description",
        "is_deleted",
        "is_enabled",
        "is_background_check",
        "is_tiered_distribute_submit",
        "is_tiered_distribute_final_approval",
        "is_manual_distribute_submit",
        "is_manual_distribute_final_approval",
        "is_shift_rate",
        "is_description_required",
        "is_description_upload_required",
        "is_country_mandatory",
        "is_address_mandatory",
        "default_expense_value",
        "allow_pre_identified_candidate",
        "resume_mandatory",
        "job_submitted_count",
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

    const job_id = await generateJobTemplateCode(program_id);

    const jobTemplate = await jobTemplateModel.create(
      {
        ...jobTemplateData,
        program_id,
        job_id,
        created_by: userId,
        modified_by: userId,
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

    if (Array.isArray(jobRateType.rates)) {
      const rateTypePromises = jobRateType.rates.map(
        (rateType: {
          rate_type_id: any;
          bill_rate: any;
          pay_rate: any;
          abbreviation: any;
          billable: any;
          name: any;
        }) =>
          jobTempRateTypeModel.create(
            {
              rate_type_id: rateType.rate_type_id,
              bill_rate: rateType.bill_rate,
              pay_rate: rateType.pay_rate,
              abbreviation: rateType.abbreviation,
              billable: rateType.billable,
              name: rateType.name,
              program_id,
              job_temp_id: jobTemplate.id,
            },
            { transaction }
          )
      );
      await Promise.all(rateTypePromises);
    }

    if (Array.isArray(jobMasterData.foundational_data)) {
      const masterDataPromises = jobMasterData.foundational_data.map(
        (masterData: {
          foundation_data_type_id: any;
          foundation_data_id: any;
          is_read_only: any;
        }) =>
          jobMasterDataModel.create(
            {
              foundation_data_type_id: masterData.foundation_data_type_id,
              foundation_data_id: masterData.foundation_data_id,
              is_read_only: masterData.is_read_only,
              program_id,
              job_temp_id: jobTemplate.id,
            },
            { transaction }
          )
      );
      await Promise.all(masterDataPromises);
    }

    if (Array.isArray(jobDistSchedule.distribute_schedule_data)) {
      const distSchedulePromises = jobDistSchedule.distribute_schedule_data.map(
        (distSchedule: {
          dist_shedule_id: any;
          schedule_value: any;
          schedule_unit: any;
          vendors: any;
        }) =>
          JobTemplateDistScheduleModel.create(
            {
              dist_shedule_id: distSchedule.dist_shedule_id,
              schedule_value: distSchedule.schedule_value,
              schedule_unit: distSchedule.schedule_unit,
              vendors: distSchedule.vendors,
              program_id,
              job_temp_id: jobTemplate.id,
            },
            { transaction }
          )
      );
      await Promise.all(distSchedulePromises);
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
    updateData.modified_on = Date.now();
    updateData.modified_by = userId;
    await jobTemplate.update(updateData);

    await jobTempletRepositories.deleteJobTemplateHierarchy(program_id, id);

    if (jobTemplateData.hierarchy && Array.isArray(jobTemplateData.hierarchy)) {
      for (const hierarchyId of jobTemplateData.hierarchy) {
        await jobTemplateHierarchyModel.create({
          job_temp_id: jobTemplate.id,
          hierarchy: hierarchyId,
          program_id: jobTemplate.program_id,
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
    if (jobRateType?.rates) {
      for (const rate_type_id of jobRateType.rates) {
        const existingRecord = await jobTempRateTypeModel.findOne({
          where: {
            program_id,
            job_temp_id: id,
            rate_type_id: rate_type_id.rate_type_id,
          },
        });
        if (existingRecord) {
          await existingRecord.update(rate_type_id);
          existingRecord.bill_rate = rate_type_id.bill_rate;
          existingRecord.pay_rate = rate_type_id.pay_rate;
          await existingRecord.save();
        } else {
          await jobTempRateTypeModel.create({
            ...rate_type_id,
            program_id,
            job_temp_id: id,
          });
        }
      }
    }

    if (jobMasterData?.foundational_data) {
      for (const data of jobMasterData.foundational_data) {
        const existingRecord = await jobMasterDataModel.findOne({
          where: {
            program_id,
            job_temp_id: id,
            foundation_data_type_id: data.foundation_data_type_id,
          },
        });
        if (existingRecord) {
          await existingRecord.update(data);
        } else {
          await jobMasterDataModel.create({
            ...data,
            program_id,
            job_temp_id: id,
          });
        }
      }
    }

    if (jobDistSchedule?.distribute_schedule_data) {
      for (const schedule of jobDistSchedule.distribute_schedule_data) {
        const existingRecord = await JobTemplateDistScheduleModel.findOne({
          where: {
            program_id,
            job_temp_id: id,
            dist_shedule_id: schedule.dist_shedule_id,
          },
        });
        if (existingRecord) {
          await existingRecord.update(schedule);
        } else {
          await JobTemplateDistScheduleModel.create({
            ...schedule,
            program_id,
            job_temp_id: id,
          });
        }
      }
    }

    if (jobQualification?.qualification_types) {
      for (const qualification_type of jobQualification.qualification_types) {
        const existingRecord = await jobTemplateQualificationModel.findOne({
          where: {
            program_id,
            job_temp_id: id,
            qualification_type_id: qualification_type.qualification_type_id,
          },
        });
        if (existingRecord) {
          await existingRecord.update(qualification_type);
        } else {
          await jobTemplateQualificationModel.create({
            ...qualification_type,
            program_id,
            job_temp_id: id,
          });
        }
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

export async function getJobTemplatesByHierarchies(
  request: FastifyRequest<{ Body: { hierarchy_ids: string[] } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids } = request.body;

    if (!hierarchy_ids || hierarchy_ids.length === 0) {
      return reply.status(400).send({
        status_code: 400,
        message: "Please fill all mandatory fields.",
        trace_id: traceId,
      });
    }
    const data = await jobTempletRepositories.getJobTemplateByHierarchies(program_id, hierarchy_ids);
    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id: traceId,
    });
  } catch (error) {
    console.error("Error fetching job templates:", error);
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
    });
  }
}

// export async function uploadFile(request: FastifyRequest, reply: FastifyReply) {
//   const traceId = generateCustomUUID();
//   try {
//     const data = await request.file();

//     if (!data) {
//       return reply.status(200).send({
//         status_code: 200,
//         message: "No file uploaded.",
//         trace_id: traceId,
//       });
//     }

//     const htmlContent = await extractFileContent(data);

//     const htmlResponse = `<html><body>${htmlContent}</body></html>`;

//     return reply.status(200).send({
//       status_code: 200,
//       message: "File uploaded successfully",
//       trace_id: traceId,
//       data: htmlResponse,
//     });
//   } catch (error) {
//     reply.status(500).send({
//       status_code: 500,
//       message: "File upload failed",
//       trace_id: traceId,
//     });
//   }
// }

export async function getAllJobTemplateHierarchyById(
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: { hierarchy_ids?: string; job_type?: string };
  }>,
  reply: FastifyReply
) {
  const trace_id = generateCustomUUID();
  try {
    const { program_id } = request.params;
    const { hierarchy_ids, job_type } = request.query;
    const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];

    const data = await jobTempletRepositories.getJobTempletByHierarchies(
      program_id,
      hierarchyIdsArray,
      job_type
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

export async function getMostUsedJobTemplates(
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: {
      hierarchy_ids?: string;
      limit?: number;
      offset?: number;
      job_type?: string;
    };
  }>,
  reply: FastifyReply
) {
  const trace_id = generateCustomUUID();
  try {
    const { program_id } = request.params;
    const { hierarchy_ids, job_type, limit, offset } = request.query;
    const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];

    const data = await jobTempletRepositories.getMostUsedJobTemplatesByProgram(
      program_id,
      hierarchyIdsArray,
      job_type,
      limit,
      offset
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

export async function getAllJobTempletsByHierarchies(
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: {
      hierarchy?: string;
      labour_category?: string;
      job_type?: string;
      name?: string;
      qualification?: string;
      limit?: number;
      offset?: number;
    };
  }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params;
    const {
      hierarchy,
      labour_category,
      job_type,
      name,
      qualification,
      limit,
      offset,
    } = request.query;

    const hierarchyIdsArray = hierarchy ? hierarchy.split(",") : [];
    const laborCategoryIdsArray = labour_category ? labour_category.split(",") : [];
    const qualificationIdsArray = qualification ? qualification.split(",") : [];

    const data = await jobTempletRepositories.getAllJobTemplateByHierarchy(
      program_id,
      hierarchyIdsArray,
      laborCategoryIdsArray,
      qualificationIdsArray,
      limit,
      offset,
      job_type,
      name
    );

    reply.status(200).send({
      status_code: 200,
      message: "Job template fetched successfully",
      job_templates: data,
      trace_id: traceId,
    });
  } catch (error) {
    console.error("Error fetching job templates:", error);
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
    });
  }
}

export async function findJobTemplatesByHierarchyIds(
  request: FastifyRequest<{
    Params: { program_id: string };
    Body: { hierarchy_ids: string[] };
  }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params;
  const { hierarchy_ids } = request.body;
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

export async function findJobTemplatesByLabourCategories(
  request: FastifyRequest<{
    Params: { program_id: string };
    Querystring: { labour_category: string };
  }>,
  reply: FastifyReply
) {
  const { program_id } = request.params;
  const { labour_category } = request.query;
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
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "No matching data found for the provided labour category.",
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

export async function getCommonHierarchies(
  request: FastifyRequest<{
    Querystring: { job_manager_id: string; job_template_id: string };
  }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { job_manager_id, job_template_id } = request.query;
    const {program_id}=request.params as {program_id:string};

    if (!job_manager_id || !job_template_id) {
      return reply.status(400).send({
        status_code: 400,
        message: "Please provide both job_manager_id and job_template_id.",
        trace_id: traceId,
      });
    }

    const [managerData, templateData] = await Promise.all([
      jobTempletRepositories.managerQuery(job_manager_id),
      jobTempletRepositories.templateQuery(job_template_id)
    ]);

    const managerHierarchyIds =
      managerData.length > 0 ? managerData[0].associate_hierarchy_ids : [];

    const templateHierarchyIds = templateData.map((row) => row.hierarchy);

    const commonHierarchyIds = managerHierarchyIds.filter((id: string) =>
      templateHierarchyIds.includes(id)
    );
    
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
  
              // Ensure node is included if it's associated OR if any child is associated
              if (isAssociated || children.length > 0) {
                  return {
                      id: item.id,
                      parent_hierarchy_id: item.parent_hierarchy_id,
                      name: item.name,
                      is_enabled: item.is_enabled,
                      is_associated: isAssociated,
                      hierarchies: children
                  };
              }
  
              // Exclude node if not associated and has no associated children
              return null;
          })
          .filter(Boolean);
  };

  const nestedHierarchy = buildHierarchy(hierarchiesWithChildren);
  
    reply.status(200).send({
      status_code: 200,
      common_hierarchies: nestedHierarchy,
      trace_id: traceId,
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