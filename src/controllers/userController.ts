import { FastifyRequest, FastifyReply } from "fastify";
import User from "../models/userModel";
import { UserInterface } from "../interfaces/userInterface";
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import hierarchies from "../models/hierarchiesModel";
import { UserMappingAttributes } from "../interfaces/usermappingInterface";
import UserMapping from "../models/usermappingModel";
import { sequelize } from "../config/instance";
import WorkLocationModel from "../models/workLocationModel";
import TimeZone from "../models/timeZoneModel";
import Language from "../models/languageModel";
import Tenant from "../models/tenantModel";
import CountryModel from "../models/countriesModel";
import candidateModel from "../models/candidateModel";
import { programVendor } from "../models/programVendorModel";
import { generateCandidateCode } from "../utility/code-genrate-service";
import { getWorkLocationTimeZoneByUserId } from "../utility/queries";
import { Op, QueryTypes } from "sequelize";
import UserMasterDataModel from "../models/userMasterDataModel";
import FoundationalDataTypes from "../models/foundationalDatatypesModel";
import foundationalData from "../models/foundationalDataModel";

export async function getUser(request: FastifyRequest, reply: FastifyReply) {
  const result = await User.findAndCountAll({
    where: {
      is_deleted: false,
    },
    attributes: ["id", "name_prefix", "first_name", "middle_name", "last_name", "username", "name_suffix", "program_id", "status", "email",
      "avatar", "country_id", "is_enabled", "is_activated", "is_deleted"
    ]
  });
  if (result.rows.length === 0) {
    return reply.status(200).send({
      message: "Users not found",
      users: []
    });
  }
  reply.status(200).send({
    status_code: 200,
    users: result.rows,
  });
}

export async function getUserById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const user = await User.findByPk(id);
    return reply.status(200).send({
      status_code: 200,
      trace_id: generateCustomUUID(),
      user: user ?? [],
      message: user ? undefined : "User not found",
    });
  } catch (error) {
    reply.status(500).send({
      message: "Internal server error",
      error: error,
      trace_id: generateCustomUUID(),
    });
  }
}
export async function getUserHierarchiesByProgram(
  request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();

  try {
    const { id: user_id, program_id } = request.params;
    const user = await User.findOne({
      where: { id: user_id, program_id },
      attributes: ['associate_hierarchy_ids', 'work_location_ids', 'default_work_location_id'],
    });

    if (!user) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'User not found or no associated hierarchies/work locations for the given program',
        hierarchies: [],
        work_locations: [],
        default_work_location: null,
      });
    }

    const associateHierarchyIds = user.associate_hierarchy_ids ?? [];
    const workLocationIds = user.work_location_ids ?? [];

    const hierarchiesData = associateHierarchyIds.length
      ? await hierarchies.findAll({
        where: { id: associateHierarchyIds },
        attributes: ['id', 'name'],
      })
      : [];

    const workLocationsData = workLocationIds.length
      ? await WorkLocationModel.findAll({
        where: { id: workLocationIds },
        attributes: ['id', 'name'],
      })
      : [];

    const defaultWorkLocation = user.default_work_location_id
      ? await WorkLocationModel.findByPk(user.default_work_location_id, {
        attributes: ['id', 'name'],
      })
      : null;

    const is_all_hierarchy_associate = hierarchiesData.length > 0 ? false : true;
    const is_all_work_location_associate = workLocationsData.length > 0 ? false : true;

    return reply.status(200).send({
      status_code: 200,
      message: 'Hierarchies and work locations fetched successfully',
      job_manager_hierarchies: {
        user_id,
        program_id,
        is_all_hierarchy_associate,
        hierarchies: hierarchiesData.map((hierarchy) => ({
          id: hierarchy.id,
          name: hierarchy.name,
        })),
        is_all_work_location_associate,
        work_locations: workLocationsData.map((location) => ({
          id: location.id,
          name: location.name,
        })),
      },
      default_work_location: defaultWorkLocation
        ? { id: defaultWorkLocation.id, name: defaultWorkLocation.name }
        : null,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: (error as any).message,
      trace_id: traceId,
    });
  }
}

export async function createUser(request: FastifyRequest, reply: FastifyReply) {
  const transaction = await sequelize.transaction();
  const traceId = generateCustomUUID();
  try {
    const { user, user_group_mapping } = request.body as {
      user: UserInterface;
      user_group_mapping: Omit<UserMappingAttributes, "id"> | Omit<UserMappingAttributes, "id">[];
    };

    if (!user?.tenant_id) {
      await transaction.rollback();
      return reply.status(400).send({
        message: "Missing user or tenant id in request body"
      });
    }

    const existingUser = await User.findOne({
      where: {
        id: user.id,
        tenant_id: user.tenant_id,
        ...(user.program_id && { program_id: user.program_id })
      },
      transaction,
    });

    if (existingUser) {
      await transaction.rollback();
      return reply.status(400).send({
        message: "User with tenant_id or program_id already exists!"
      });
    }

    let newUser;

    const userType = Array.isArray(user_group_mapping) ? user_group_mapping[0].user_type : user_group_mapping.user_type;

    if (userType === "client" || userType === "msp") {
      newUser = await User.create({ ...user, user_type: userType }, { transaction });
    } else if (userType === "candidate") {
      const program_id = user.program_id;
      if (!program_id) {
        throw new Error("Program ID is required to generate candidate code");
      }
      const candidateId = await generateCandidateCode(program_id);
      await candidateModel.create({ ...user, user_id: user.id, candidate_id: candidateId }, { transaction });
    } else if (userType === "vendor") {
      if (user.program_id) {
        newUser = await User.create({ ...user, user_type: userType }, { transaction });
        await programVendor.create({ ...user, user_id: user.id }, { transaction });
      } else {
        newUser = await User.create({ ...user, user_type: userType }, { transaction });
      }
    } else {
      newUser = await User.create({ ...user, user_type: userType }, { transaction });
    }

   


    const foundationalData = user.foundational_data;
    if (Array.isArray(foundationalData) && foundationalData.length > 0) {
      await Promise.all(
        foundationalData.map(async (data) => {
          await UserMasterDataModel.create(
            {
              user_id: user.id,
              foundation_data_type_id: data.foundation_data_type_id,
              foundation_data_ids: data.foundation_data_ids,
              default_master_data:data.default_master_data || null,
              is_associated:data.is_associated || false
            },
            { transaction }
          );
        })
      );
    }

    if (Array.isArray(user_group_mapping)) {
      for (const mapping of user_group_mapping) {
        await UserMapping.create({ ...mapping }, { transaction });
      }
    } else {
      await UserMapping.create({ ...user_group_mapping }, { transaction });
    }

    await transaction.commit();
    return reply.status(201).send({
      status_code: 201,
      id: newUser instanceof User ? newUser.id : undefined,
      trace_id: traceId,
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error(error);
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0].path;
      return reply.status(400).send({
        message: `${field} already in use!`
      });
    }
    return reply.status(500).send({
      message: "Internal server error",
      error:error.message,
      trace_id: traceId,
    });
  }
}

export async function updateUser(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const updates = request.body as Partial<UserInterface>;
  try {
    const [user] = await User.update(updates, {
      where: { id, program_id }
    });

    if (user === 0) {
      return reply.status(200).send({
        message: "User not found",
        user: []
      });
    }

    return reply.status(201).send({
      status_code: 201,
      message: "User updated successfully",
      id: id,
      trace_id: generateCustomUUID()
    });
  } catch (error) {
    return reply.status(500).send({
      message: "Internal Server Error",
      trace_id: generateCustomUUID(),
      error
    });
  }
}

export async function deleteUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const numRowsDeleted = await User.destroy({ where: { id } });
    if (numRowsDeleted > 0) {
      return reply.status(201).send({
        status_code: 201,
        message: "User deleted succesfully",
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({ message: "User not found" });
    }
  } catch (error) {
    reply.status(500).send({
      message: "An error occurred while deleting User",
      error: error,
    });
  }
}

export async function getAllUserIDAndUserId(
  request: FastifyRequest<{ Params: { program_id: string }; Querystring: { user_id?: string; info_level?: string; user_type?: string; first_name?: string; is_activated?: boolean; role_id?: string; tenant_id?: string; email?: string } }>,
  reply: FastifyReply
) {
  const { program_id } = request.params;
  const { user_id, info_level, user_type, first_name, is_activated, role_id, tenant_id, email } = request.query;
 
  try {
    const whereClause: any = {
      is_deleted: false,
      program_id,
    };
 
    if (user_type) {
      whereClause.user_type = user_type;
    }
 
    if (user_id) {
      whereClause.id = user_id;
    }
    if (typeof is_activated === 'string') {
      if (is_activated === 'true') {
        whereClause.is_activated = true;
      } else if (is_activated === 'false') {
        whereClause.is_activated = false;
      }
    }
    if (role_id) {
      whereClause.role_id = role_id;
    }
 
    if (tenant_id) {
      whereClause.tenant_id = tenant_id;
    }
    if (email) {
      whereClause.email = email;
    }
    if (first_name) {
      whereClause.first_name = first_name;
    }
    // Define attributes based on info_level
    let attributes: string[] | undefined = [
      "id", "name_prefix", "first_name", "middle_name", "last_name", "username",
      "name_suffix", "program_id", "email", "avatar", "country_id",
      "tenant_id", "language_id", "time_zone_id",
      "is_enabled", "is_activated", "is_deleted",
      "associate_hierarchy_ids", "work_location_ids",
      "default_hierarchy_id", "default_work_location_id", "user_type"
    ];
 
    if (info_level === "detail") {
      attributes = undefined; // Fetch all attributes if info_level is "detail"
    }
 
    // Fetch users
    const users = await User.findAll({
      where: whereClause,
      attributes,
      order: [['created_on', 'DESC']],
    });
 
    const foundationalDataDetails: { user_id: string | undefined; foundation_data_type: { id: any; name: any; } | null; foundation_data_items: { id: any; name: any; }[]; }[] = [];
   
    for (const user of users) {
      try {
        const userMasterData = await UserMasterDataModel.findAll({
          where: { user_id: user.id },
          attributes: ["foundation_data_type_id", "foundation_data_ids"],
        });
   
        for (const data of userMasterData) {
          const foundationType = await FoundationalDataTypes.findOne({
            where: { id: data.foundation_data_type_id },
            attributes: ["id", "name"],
          });
   
          const foundationDataItems = await foundationalData.findAll({
            where: { id: { [Op.in]: data.foundation_data_ids } },
            attributes: ["id", "name"],
          });
   
          foundationalDataDetails.push({
            user_id: user.id,
            foundation_data_type: foundationType
              ? { id: foundationType.id, name: foundationType.name }
              : null,
            foundation_data_items: foundationDataItems.map((item) => ({
              id: item.id,
              name: item.name,
            })),
          });
        }
      } catch (err) {
        console.error(`Error processing foundational data for user ${user.id}:`, err);
      }
    }

    const hierarchyIds = users.flatMap(user => user.associate_hierarchy_ids || []);
    const workLocationIds = users.flatMap(user => user.work_location_ids || []);
    const defaultHierarchyIds = users.flatMap(user => user.default_hierarchy_id ? [user.default_hierarchy_id] : []);
    const defaultWorkLocationIds = users.flatMap(user => user.default_work_location_id ? [user.default_work_location_id] : []);
    const countryIds = users.flatMap(user => user.country_id ? [user.country_id] : []);
    const tenantIds = users.flatMap(user => user.tenant_id ? [user.tenant_id] : []);
    const languageIds = users.flatMap(user => user.language_id ? [user.language_id] : []);
    const timeZoneIds = users.flatMap(user => user.time_zone_id ? [user.time_zone_id] : []);
 
    const hierarchie = hierarchyIds.length > 0 ? await hierarchies.findAll({
      where: { id: hierarchyIds },
      attributes: ['id', 'name']
    }) : [];
 
    const workLocations = workLocationIds.length > 0 ? await WorkLocationModel.findAll({
      where: { id: workLocationIds },
      attributes: ['id', 'name']
    }) : [];
 
    const defaultHierarchies = defaultHierarchyIds.length > 0 ? await hierarchies.findAll({
      where: { id: defaultHierarchyIds },
      attributes: ['id', 'name']
    }) : [];
 
    const defaultWorkLocations = defaultWorkLocationIds.length > 0 ? await WorkLocationModel.findAll({
      where: { id: defaultWorkLocationIds },
      attributes: ['id', 'name']
    }) : [];
 
    const countries = countryIds.length > 0 ? await CountryModel.findAll({
      where: { id: countryIds },
      attributes: ['id', 'name']
    }) : [];
 
    const tenants = tenantIds.length > 0 ? await Tenant.findAll({
      where: { id: tenantIds },
      attributes: ['id', 'name']
    }) : [];
 
    const languages = languageIds.length > 0 ? await Language.findAll({
      where: { id: languageIds },
      attributes: ['id', 'name']
    }) : [];
 
    const timeZones = timeZoneIds.length > 0 ? await TimeZone.findAll({
      where: { id: timeZoneIds },
      attributes: ['id', 'name']
    }) : [];
 
    const enrichedUsers = users.map(user => {
      const userHierarchies = hierarchie.filter(hierarchy => user.associate_hierarchy_ids?.includes(hierarchy.id));
      const userWorkLocations = workLocations.filter(location => user.work_location_ids?.includes(location.id));
      const defaultHierarchy = defaultHierarchies.find(hierarchy => hierarchy.id === user.default_hierarchy_id);
      const defaultWorkLocation = defaultWorkLocations.find(location => location.id === user.default_work_location_id);
      const country = countries.find(country => country.id === user.country_id);
      const tenant = tenants.find(tenant => tenant.id === user.tenant_id);
      const language = languages.find(language => language.id === user.language_id);
      const timeZone = timeZones.find(timeZone => timeZone.id === user.time_zone_id);
      const userFoundationalData = foundationalDataDetails.filter(
        (data) => data.user_id === user.id
      );
      return {
        ...user.toJSON(),
        associate_hierarchy_ids: userHierarchies.map(hierarchy => ({ id: hierarchy.id, name: hierarchy.name })),
        work_location_ids: userWorkLocations.map(location => ({ id: location.id, name: location.name })),
        default_hierarchy_id: defaultHierarchy ? { id: defaultHierarchy.id, name: defaultHierarchy.name } : null,
        default_work_location_id: defaultWorkLocation ? { id: defaultWorkLocation.id, name: defaultWorkLocation.name } : null,
        country_id: country ? { id: country.id, name: country.name } : null,
        tenant_id: tenant ? { id: tenant.id, name: tenant.name } : null,
        language_id: language ? { id: language.id, name: language.name } : null,
        time_zone_id: timeZone ? { id: timeZone.id, name: timeZone.name } : null,
        foundational_data: userFoundationalData,
      };
    });
 
    const totalCount = await User.count({
      where: whereClause,
    });
 
    reply.status(200).send({
      status_code: 200,
      trace_id: generateCustomUUID(),
      users: enrichedUsers,
      total_count: totalCount,
    });
  } catch (error:any) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      error: error.message,
      trace_id: generateCustomUUID(),
    });
  }
}
 





export async function searchUser(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['is_enabled', 'program_id', 'first_name'];
  const responseFields = ['id', 'program_id', 'country_id', 'title', 'name_prefix', 'middle_name', 'is_enabled', 'addresses', 'contacts', 'name_suffix', 'email', 'created_on', 'modified_on', 'created_by', 'modified_by', 'is_deleted', 'ref_id'];
  return baseSearch(request, reply, User, searchFields, responseFields);
}

const setAssociations = async (newUser: any, user: UserInterface, transaction: any) => {
  if (user.associate_hierarchy_ids) {
    await newUser.setHierarchies(user.associate_hierarchy_ids, { transaction });
  }

  if (user.work_location_ids) {
    await newUser.setWork_locations(user.work_location_ids, { transaction });
  }
};
interface UserLocationAndTimeZone {
  work_location: { work_location_id: string; work_location_name: string }[];
  time_zone: { time_zone_id: string; time_zone_name: string }[];
}

export async function getUserWorkLocationAndTimeZone(
  request: FastifyRequest<{ Params: { program_id: string }; Querystring: { user_ids: string } }>,
  reply: FastifyReply
) {
  const { program_id } = request.params;
  const { user_ids } = request.query;
  const trace_id = generateCustomUUID();

  if (!user_ids) {
    return reply.status(400).send({
      message: "Missing user_ids in the query string.",
      trace_id,
    });
  }

  try {
    const userIdsArray = user_ids.split(',');

    const [result] = (await sequelize.query(getWorkLocationTimeZoneByUserId, {
      replacements: { user_ids: userIdsArray, program_id },
      type: QueryTypes.SELECT,
    })) as [UserLocationAndTimeZone | undefined];

    const workLocationValid = result?.work_location?.some(loc => loc.work_location_id !== null);
    const timeZoneValid = result?.time_zone?.some(zone => zone.time_zone_id !== null);

    if (!result || !workLocationValid || !timeZoneValid) {
      return reply.status(200).send({
        message: "No data found for the provided user IDs and program ID.",
        data: {
          work_location: [],
          time_zone: [],
        },
        trace_id,
      });
    }

    const uniqueWorkLocations = removeDuplicates(result.work_location || [], 'work_location_id');
    const uniqueTimeZones = removeDuplicates(result.time_zone || [], 'time_zone_id');

    return reply.status(200).send({
      status_code: 200,
      data: {
        work_location: uniqueWorkLocations,
        time_zone: uniqueTimeZones,
      },
      trace_id,
    });
  } catch (error) {
    console.error("Error retrieving work location and time zone:", error);
    return reply.status(500).send({
      message: "Internal Server Error",
      trace_id,
    });
  }
}

function removeDuplicates<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const identifier = item[key];
    if (seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
}
