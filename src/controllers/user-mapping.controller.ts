import { FastifyRequest, FastifyReply } from "fastify";
import UserMapping from "../models/user-mapping.model";
import { UserMappingAttributes } from "../interfaces/user-mapping.interface";
import User from "../models/user.model";
import generateCustomUUID from "../utility/genrateTraceId";
import Tenant from "../models/tenant.model";
import hierarchies from "../models/hierarchies.model";
import WorkLocationModel from "../models/work-location.model";
import Language from "../models/language.model";
import TimeZone from "../models/time-zone.model";
import CountryModel from "../models/countries.model";
import { decodeToken } from "../middlewares/verifyToken";
import Hierarchies from "../models/hierarchies.model";
import { getMasterData } from "../utility/queries";
import { sequelize } from "../config/instance";
import { QueryTypes } from "sequelize";
export const getAllUserMappings = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const userMappings = await UserMapping.findAll();
        if (userMappings.length === 0) {
            return reply.status(200).send({
                status_code:200,
                message: "User mappings not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
        reply.status(200).send(userMappings);
    } catch (error) {
        reply.status(500).send({
            status_code:500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};


export const getUserMappingById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const traceId=generateCustomUUID();
    try {
        const userMapping = await UserMapping.findByPk(id);
        if (userMapping) {
            reply.status(200).send({
                status_code: 200,
                message: "Data fetched successfully",
                user_mapping: userMapping,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "User Mapping not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};

export async function createUserMappings(
    request_payload: Omit<UserMappingAttributes, "id">,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const { tenant_id, user_id, role_id, program_id } = request_payload;

        const existingMapping = await UserMapping.findOne({
            where: {
                tenant_id,
                user_id,
                program_id
            }
        });

        if (existingMapping) {
            return reply.status(200).send({
                status_code: 200,
                message: "A user mapping already exists for the specified tenant, user, and program.",
                trace_id: traceId,
            });
        }

        const newUserMapping = await UserMapping.create({ tenant_id, user_id, role_id, program_id });
        return reply.status(201).send({
            status_code: 201,
            message: "User Mapping created successfully",
            user_mapping: newUserMapping,
            trace_id: traceId,
        });

    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
}

export const updateUserMappingById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<UserMappingAttributes>;
    const traceId=generateCustomUUID();
    try {
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
       updates.modified_on=Date.now()
        const [updatedCount] = await UserMapping.update({...updates,modified_by: userId,}, { where: { id: id } });
        if (updatedCount > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "User Mapping updated successfully",
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "User Mapping not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};


export const deleteUserMappingById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const traceId=generateCustomUUID();
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
        const deletedCount = await UserMapping.destroy({ where: { id: id } });
        if (deletedCount > 0) {
            reply.status(204).send({
                status_code: 204,
                message: "User Mapping deleted successfully",
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "User Mapping not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};

export const getUserMappings = async (request: FastifyRequest, reply: FastifyReply) => {
    const { program_id, id } = request.params as { program_id: string; id: string };
    const queryParams = request.query as { [key: string]: string | boolean };
    const traceId = generateCustomUUID();

    try {
        // Construct whereClause dynamically
        const whereClause: any = {};
        if (program_id) whereClause.program_id = program_id;
        if (id) whereClause.id = id;

        Object.entries(queryParams).forEach(([key, value]) => {
            if (!["id", "program_id"].includes(key)) {
                whereClause[key] = value === "true" ? true : value === "false" ? false : value;
            }
        });

        // Main User Mappings SQL query
        const query = `
            SELECT 
                um.id, 
                um.tenant_id, 
                um.role_id, 
                um.user_id, 
                um.program_id, 
                um.is_activated, 
                um.is_deleted, 
                um.created_on, 
                um.modified_on, 
                um.created_by, 
                um.modified_by,
                JSON_OBJECT(
                    'id', u.id,
                    'user_id',u.user_id,
                    'program_id', u.program_id,
                    'tenant_id', u.tenant_id,
                    'first_name', u.first_name,
                    'last_name', u.last_name,
                    'email', u.email,
                    'sso_id', u.sso_id,
                    'title', u.title,
                    'user_type',u.user_type,
                    'avatar', u.avatar,
                    'status',um.status,
                    'theme', u.theme,
                    'country_id', u.country_id,
                    'applications', u.applications,
                    'credentials', u.credentials,
                    'supervisor', u.supervisor,
                    'time_zone_id', u.time_zone_id,
                    'language_id', u.language_id,
                    'role_id',u.role_id,
                    'associate_hierarchy_ids', u.associate_hierarchy_ids,
                    'work_location_ids', u.work_location_ids,
                    'associate_cost_ids', u.associate_cost_ids,
                    'spend_category_ids', u.spend_category_ids,
                    'is_all_hierarchy_associate', u.is_all_hierarchy_associate,
                    'is_all_work_location_associate', u.is_all_work_location_associate,
                    'is_all_cost_center_associate', u.is_all_cost_center_associate,
                    'default_cost_center_id', u.default_cost_center_id,
                    'is_all_spend_category_associate', u.is_all_spend_category_associate,
                    'default_spend_category_id', u.default_spend_category_id,
                    'is_allow_unlimited_authority', u.is_allow_unlimited_authority,
                    'min_limit', u.min_limit,
                    'max_limit', u.max_limit,
                    'is_enabled', u.is_enabled,
                    'is_activated', u.is_activated,
                    'is_deleted', u.is_deleted,
                    'created_on', u.created_on,
                    'modified_on', u.modified_on,
                    'created_by', u.created_by,
                    'addresses',u.addresses,
                    'contacts',u.contacts,
                    'modified_by', u.modified_by,
                    'countries', JSON_OBJECT('id', ct.id, 'name', ct.name),
                    'supervisor_id', JSON_OBJECT('id', su.user_id, 'first_name', su.first_name, 'last_name', su.last_name),
                    'default_hierarchy_id', JSON_OBJECT('id', dh.id, 'name', dh.name),
                    'default_work_location_id', JSON_OBJECT('id', dwl.id, 'name', dwl.name),
                    'associate_hierarchy_ids', (
                        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name))
                        FROM hierarchies h
                        WHERE JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(h.id))
                    ),
                    'work_location_ids', (
                        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', wl.id, 'name', wl.name))
                        FROM work_locations wl
                        WHERE JSON_CONTAINS(u.work_location_ids, JSON_QUOTE(wl.id))
                    )
                ) AS user
            FROM user_mappings um
            LEFT JOIN user u ON um.user_id = u.user_id
            LEFT JOIN tenant t ON um.tenant_id = t.id
            LEFT JOIN countries ct ON u.country_id = ct.id
            LEFT JOIN hierarchies dh ON u.default_hierarchy_id = dh.id
            LEFT JOIN work_locations dwl ON u.default_work_location_id = dwl.id
            LEFT JOIN user su ON u.supervisor = su.user_id
            WHERE um.program_id = :program_id AND um.id = :id;
        `;

        // Query execution
        const replacements = { program_id, id };
        const userMappings = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        })as any;

        // Response handling
        if (!userMappings.length) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: "No User Mappings found for the given criteria",
                user_mappings: [],
            });
        }

for (const mapping of userMappings) {
    const userId = mapping.user?.user_id;
    console.log("63274",userId)

    if (userId) {
        const masterDataQuery = `
            SELECT
                JSON_OBJECT(
                    'master_data', JSON_OBJECT(
                        'id', master_data_type.id,
                        'name', master_data_type.name,
                        'configuration', master_data_type.configuration
                    ),
                    'associated_master_data', (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT('id', md1.id, 'name', md1.name)
                        )
                        FROM master_data AS md1
                        WHERE JSON_CONTAINS(user_master_data.associated_master_data, JSON_QUOTE(md1.id), '$')
                    ),
                    'default_master_data', JSON_OBJECT(
                        'id', md2.id,
                        'name', md2.name
                    ),
                    'is_all_associated', user_master_data.is_all_associated=1
                ) AS foundational_data
            FROM user
            LEFT JOIN user_master_data ON user_master_data.user_id = user.user_id
            LEFT JOIN master_data_type ON user_master_data.master_data = master_data_type.id
            LEFT JOIN master_data AS md2 ON user_master_data.default_master_data = md2.id
            WHERE user_master_data.user_id = :user_id;
        `;

        const masterDataResults = await sequelize.query(masterDataQuery, {
            replacements: { user_id: userId },
            type: QueryTypes.SELECT,
        }) as any;

        mapping.user.foundational_data = masterDataResults.map((result: any) => result.foundational_data);
    }
}

 reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: "User mappings records fetched successfully.",
            user_mappings: userMappings,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message || error,
        });
    }
};

export async function updateStatus(
  request: FastifyRequest<{
    Params: { program_id: string; id: string };
  }>,
  reply: FastifyReply
) {
  const { program_id, id } = request.params;
  const traceId = generateCustomUUID();

  try {
    const userMapping = await UserMapping.findOne({
      where: { program_id, id },
    });
    if (!userMapping) {
      return reply.code(404).send({
        status_code: 404,
        message: "No matching user mapping record found.",
        trace_id: traceId,
      });
    }

    const newStatus = !userMapping.is_activated;
    await UserMapping.update(
      { is_activated: newStatus },
      { where: { program_id, id } }
    );
    return reply.code(200).send({
      status_code: 200,
      message: `User mapping updatd successfully`,
      trace_id: traceId,
    });
  } catch (error: any) {
    return reply.code(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message,
    });
  }
}

