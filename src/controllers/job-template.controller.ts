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
import jobCategoryModel from "../models/job-category.model";
import jobTempRateTypeModel from "../models/job-temp-rate-type.model";
import jobTemplateQualificationModel from "../models/job-template-qualification.model";
import jobTemplateHierarchyModel from "../models/job-template-hierarchie.model";
import JobTemplateDistScheduleModel from "../models/job-template-dist-schedule.model";
import jobMasterDataModel from "../models/job-master-data.model";
import { generateJobTemplateCode } from "../hooks/jobTemplateCodeGenerate";
import IndustriesModel from "../models/labour-category.model";
import hierarchies from "../models/hierarchies.model";
import { Op, QueryTypes } from "sequelize";
import {
  getJobTempletByHierarchies,
  getJobTemplateByHierarchies,
  getMostUsedJobTemplatesByProgram,
  getAllJobTemplateByHierarchy,
  deleteJobTemplateHierarchyQuery,
} from "../utility/queries";
import { sequelize } from '../config/instance';
// import { extractFileContent } from "../utility/fileUpload";
import jobTemplateCustomFieldModel from "../models/job-template-custom-field.model";
import Qualifications from "../models/qualificationsModel";
import foundationalDataTypesModel from "../models/foundational-datatypes.model";

interface FoundationalDataMap {
  [key: string]: string | null;
}

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
      category,
      page = 1,
      limit = 10,
    } = request.query as GetJobTemplatesQuery;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    const whereClause: any = { program_id, is_deleted: false };
    if (id) whereClause.id = id;
    if (job_id) whereClause.job_id = job_id;
    if (is_enabled !== undefined) {
      whereClause.is_enabled = is_enabled.toString() !== "false";
    }
    if (template_name)
      whereClause.template_name = { [Op.like]: `%${template_name}%` };
    if (labour_category) whereClause.labour_category = labour_category;

    const categoryWhereClause: any = {};
    if (category) {
      categoryWhereClause.title = { [Op.like]: `%${category}%` };
    }

    const jobTemplates = await jobTemplateModel.findAndCountAll({
      where: whereClause,
      attributes: ["program_id", "id", "job_id", "is_enabled", "template_name"],
      include: [
        {
          model: jobCategoryModel,
          as: "job_category",
          attributes: ["id", "title"],
          where: category ? categoryWhereClause : undefined,
        },
        {
          model: IndustriesModel,
          as: "industries",
          attributes: ["id", "name"],
        },
      ],
      limit: limitNumber,
      offset: offset,
      order: [["created_on", "DESC"]],
    });

    const totalPages = Math.ceil(jobTemplates.count / limitNumber);
    const currentPage = pageNumber;

    const formattedJobTemplates = jobTemplates.rows.map((jobTemplate: any) => {
      return {
        ...jobTemplate.get(),
        category_name: jobTemplate.job_category
          ? jobTemplate.job_category.title
          : null,
      };
    });

    reply.status(200).send({
      statusCode: 200,
      trace_id: traceId,
      job_templates: formattedJobTemplates,
      pagination: {
        total_count: jobTemplates.count,
        total_pages: totalPages,
        page: currentPage,
        limit: limitNumber,
      },
    });
  } catch (error) {
    reply.status(500).send({
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
      error: (error as any).message,
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

    const jobTemplate = await jobTemplateModel.findOne({
      where: { program_id, id, is_deleted: false },
      attributes: {
        exclude: [
          "is_deleted",
          "created_on",
          "created_by",
          "modified_by",
          "labour_category",
          "category",
        ],
      },
      include: [
        {
          model: jobCategoryModel,
          as: "job_category",
          attributes: ["id", "title"],
        },
        {
          model: IndustriesModel,
          as: "industries",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!jobTemplate) {
      reply.status(200).send({
        message: "Job Template data not found.",
        trace_id: traceId,
        job_templates: [],
        job_template: null,
      });
      return;
    }

    const jobTemplateQualifications =
      await jobTemplateQualificationModel.findAll({
        where: { job_temp_id: jobTemplate.id },
        attributes: [
          "id",
          "qualification_type_id",
          "name",
          "code",
          "is_required",
          "qualifications",
        ],
      });

    const qualificationDetails = await Promise.all(
      jobTemplateQualifications.map(async (qual) => {
        const qualificationsWithNames = await Promise.all(
          qual.qualifications.map(async (q: { qualification_id: any }) => {
            const qualificationDetail = await Qualifications.findOne({
              where: { id: q.qualification_id },
              attributes: ["name"],
            });
            return {
              ...q,
              name: qualificationDetail?.name ?? null,
            };
          })
        );
        return {
          qualification_type_id: qual.qualification_type_id,
          name: qual.name,
          code: qual.code,
          is_required: qual.is_required,
          qualifications: qualificationsWithNames,
        };
      })
    );

    const jobTemplateDistributionSchedules =
      await JobTemplateDistScheduleModel.findAll({
        where: { job_temp_id: jobTemplate.id },
        attributes: [
          "id",
          "dist_shedule_id",
          "schedule_value",
          "schedule_unit",
          "vendors",
        ],
      });
    const jobMasterData = await jobMasterDataModel.findAll({
      where: { job_temp_id: jobTemplate.id },
      attributes: [
        "id",
        "foundation_data_type_id",
        "foundation_data_id",
        "is_read_only",
      ],
    });

    const jobMasterDataWithDetails = await Promise.all(
      jobMasterData.map(async (data) => {
        const foundationDataType = await foundationalDataTypesModel.findOne({
          where: { id: data.foundation_data_type_id },
          attributes: ["name"],
        });

        return {
          id: data.id,
          foundation_data_type_id: data.foundation_data_type_id,
          foundation_data_type_name: foundationDataType
            ? foundationDataType.name
            : null,
          foundation_data_id: data.foundation_data_id,
          is_read_only: data.is_read_only,
        };
      })
    );

    const jobTemplateRateTypes = await jobTempRateTypeModel.findAll({
      where: { job_temp_id: jobTemplate.id },
      attributes: [
        "id",
        "bill_rate",
        "pay_rate",
        "abbreviation",
        "billable",
        "name",
      ],
    });

    const jobCustomFields = await jobTemplateCustomFieldModel.findAll({
      where: { job_temp_id: jobTemplate.id },
      attributes: ["custom_field_id", "value"],
    });

    const jobTemplateHierarchy = await jobTemplateHierarchyModel.findAll({
      where: { job_temp_id: jobTemplate.id },
    });

    const hierarchyIds = jobTemplateHierarchy.map(
      (hierarchy) => hierarchy.hierarchy
    );

    let hierarchiesData: hierarchies[] = [];
    if (hierarchyIds.length > 0) {
      hierarchiesData = await hierarchies.findAll({
        where: {
          id: {
            [Op.in]: hierarchyIds,
          },
        },
        attributes: ["id", "name"],
      });
    }

    const result = {
      ...jobTemplate.toJSON(),
      job_category: jobTemplate.job_category || null,
      job_template_qualifications: qualificationDetails,
      job_template_distribution_schedules: jobTemplateDistributionSchedules,
      job_master_data: jobMasterDataWithDetails,
      job_template_rate_types: jobTemplateRateTypes,
      hierarchies: hierarchiesData,
      job_template_custom_fields: jobCustomFields,
    };

    reply.status(200).send({
      statusCode: 200,
      message:"Job template fetched successfully",
      job_template: result,
      trace_id: traceId,
    });
  } catch (error) {
    console.error("Error fetching job template data:", error);
    reply.status(500).send({
      message: "An error occurred while fetching job template data.",
      error: (error as any).message,
      trace_id: traceId,
    });
  }
}

export async function createJobTemplate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const jobTemplateData = request.body as JobTemplateInterface;
    const jobMasterData = request.body as JobMasterDataInterface;
    const jobRateType = request.body as JobTempRateTypeInterface;
    const jobDistSchedule = request.body as JobTemplateDistSchedule;
    const jobQualification = request.body as JobTemplateQualificationInterface;
    const jobTempCustomField = request.body as jobTemplateCustomFieldModel;

    const { program_id } = request.params as { program_id: string };
    const existingTemplate = await jobTemplateModel.findOne({
      where: { template_name: jobTemplateData.template_name, program_id },
    });

    if (existingTemplate) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "Job template with this name already exists.",
      });
    }
    const job_id = await generateJobTemplateCode(program_id);
    const jobTemplate = await jobTemplateModel.create({
      ...jobTemplateData,
      program_id,
      job_id,
    });
    if (jobTemplateData.hierarchy && Array.isArray(jobTemplateData.hierarchy)) {
      for (const hierarchyId of jobTemplateData.hierarchy) {
        await jobTemplateHierarchyModel.create({
          job_temp_id: jobTemplate.id,
          hierarchy: hierarchyId,
          program_id: jobTemplate.program_id,
        });
      }
    }
    if (Array.isArray(jobTempCustomField.custom_fields)) {
      const customFieldPromises = jobTempCustomField.custom_fields.map(
        (field: { id: string; value: string }) =>
          jobTemplateCustomFieldModel.create({
            custom_field_id: field.id,
            value: field.value,
            program_id,
            job_temp_id: jobTemplate.id,
          })
      );
      await Promise.all(customFieldPromises);
    }
    const rateTypePromises = Array.isArray(jobRateType.rates)
      ? jobRateType.rates.map(
        (rateType: {
          rate_type_id: any;
          bill_rate: any;
          pay_rate: any;
          abbreviation: any;
          billable: any;
          name: any;
        }) =>
          jobTempRateTypeModel.create({
            rate_type_id: rateType.rate_type_id,
            bill_rate: rateType.bill_rate,
            pay_rate: rateType.pay_rate,
            abbreviation: rateType.abbreviation,
            billable: rateType.billable,
            name: rateType.name,
            program_id,
            job_temp_id: jobTemplate.id,
          })
      )
      : [];

    const masterDataPromises = Array.isArray(jobMasterData.foundational_data)
      ? jobMasterData.foundational_data.map(
        (masterData: {
          foundation_data_type_id: any;
          foundation_data_id: any;
          is_read_only: any;
        }) =>
          jobMasterDataModel.create({
            foundation_data_type_id: masterData.foundation_data_type_id,
            foundation_data_id: masterData.foundation_data_id,
            is_read_only: masterData.is_read_only,
            program_id,
            job_temp_id: jobTemplate.id,
          })
      )
      : [];

    const distSchedulePromises = Array.isArray(
      jobDistSchedule.distribute_schedule_data
    )
      ? jobDistSchedule.distribute_schedule_data.map(
        (distSchedule: {
          dist_shedule_id: any;
          schedule_value: any;
          schedule_unit: any;
          vendors: any;
        }) =>
          JobTemplateDistScheduleModel.create({
            dist_shedule_id: distSchedule.dist_shedule_id,
            schedule_value: distSchedule.schedule_value,
            schedule_unit: distSchedule.schedule_unit,
            vendors: distSchedule.vendors,
            program_id,
            job_temp_id: jobTemplate.id,
          })
      )
      : [];

    const qualificationPromises = Array.isArray(
      jobQualification.qualification_types
    )
      ? jobQualification.qualification_types.map(
        (qualification: {
          qualification_type_id: any;
          is_required: any;
          name: any;
          code: any;
          qualifications: any;
        }) =>
          jobTemplateQualificationModel.create({
            qualification_type_id: qualification.qualification_type_id,
            is_required: qualification.is_required,
            name: qualification.name,
            code: qualification.code,
            qualifications: qualification.qualifications,
            program_id,
            job_temp_id: jobTemplate.id,
          })
      )
      : [];

    await Promise.all([
      ...rateTypePromises,
      ...masterDataPromises,
      ...distSchedulePromises,
      ...qualificationPromises,
    ]);

    reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: "Job template created successfully.",
      id: jobTemplate.id,
    });
  } catch (error: any) {
    console.log("Error : ", error, "trace_id:", traceId);
    reply.status(500).send({
      message: "Internal Server error.",
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
    await jobTemplate.update(updateData);

    await sequelize.query(
      deleteJobTemplateHierarchyQuery,
      {
        replacements: {
          program_id: jobTemplate.program_id,
          job_temp_id: jobTemplate.id,
        },
      }
    );

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
    const query = getJobTemplateByHierarchies();
    const data = await sequelize.query(query, {
      replacements: {
        program_id,
        hierarchy_ids,
      },
      type: QueryTypes.SELECT,
    });
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
    const includeJobIdFilter = hierarchyIdsArray.length > 0;
    const query = getJobTempletByHierarchies(
      includeJobIdFilter,
      hierarchyIdsArray,
      job_type
    );
    const replacements = [program_id, ...hierarchyIdsArray];
    if (job_type) {
      replacements.push(job_type);
    }
    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });
    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id:trace_id,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id:trace_id,
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
    const { hierarchy_ids, job_type } = request.query;
    const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];
    const includeJobIdFilter = hierarchyIdsArray.length > 0;
    const query = getMostUsedJobTemplatesByProgram(
      includeJobIdFilter,
      hierarchyIdsArray,
      job_type
    );
    const replacements = includeJobIdFilter
      ? [program_id, ...hierarchyIdsArray]
      : [program_id];
    if (job_type) {
      replacements.push(job_type);
    }
    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });
    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id:trace_id,
    });
    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id:trace_id,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id:trace_id,
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
    const includeJobIdFilter = hierarchyIdsArray.length > 0;

    const laborCategoryIdsArray = labour_category
      ? labour_category.split(",")
      : [];
    const includeLaborCategoryIdFilter = laborCategoryIdsArray.length > 0;

    const qualificationIdsArray = qualification ? qualification.split(",") : [];
    const includeQualificationIdFilter = qualificationIdsArray.length > 0;

    const query = getAllJobTemplateByHierarchy(
      includeJobIdFilter,
      hierarchyIdsArray,
      includeLaborCategoryIdFilter,
      laborCategoryIdsArray,
      includeQualificationIdFilter,
      qualificationIdsArray,
      limit,
      offset,
      job_type,
      name
    );

    const replacements: (string | number)[] = [program_id];
    if (includeJobIdFilter) {
      replacements.push(...hierarchyIdsArray);
    }
    if (includeLaborCategoryIdFilter) {
      replacements.push(...laborCategoryIdsArray);
    }
    if (includeQualificationIdFilter) {
      replacements.push(...qualificationIdsArray);
    }
    if (job_type) {
      replacements.push(job_type);
    }
    if (name) {
      replacements.push(`%${name}%`);
    }
    if (limit && offset) {
      replacements.push(limit, offset);
    }

    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

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
