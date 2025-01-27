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
        const whereClause: any = {};
        if (program_id) whereClause.program_id = program_id;
        if (id) whereClause.id = id;
        if (queryParams.tenant_id) whereClause.tenant_id = queryParams.tenant_id;
        if (queryParams.user_id) whereClause.user_id = queryParams.user_id;

        Object.entries(queryParams).forEach(([key, value]) => {
            if (!["tenant_id", "user_id", "id", "program_id"].includes(key)) {
                whereClause[key] = value === "true" ? true : value === "false" ? false : value;
            }
        });

        // Fetch user mappings based on the whereClause
        const userMappings = await UserMapping.findAll({
            attributes: [
                "id", "tenant_id", "role_id", "user_id",
                "program_id", "is_activated", "is_deleted",
                "created_on", "modified_on", "created_by",
                "modified_by", "ref_id", "status"
            ],
            where: whereClause
        });

        if (userMappings.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: "No User Mappings found for the given criteria",
                user_mappings: []
            });
        }

        // Get user IDs and tenant IDs from the user mappings
        const userIds = userMappings.map(mapping => mapping.user_id);
        const tenantIds = userMappings.map(mapping => mapping.tenant_id);

        // Fetch related data: Users, Countries, Supervisors, Tenants
        const users = await User.findAll({
            where: { id: userIds },
            attributes: { exclude: ["status"] }
        })as any;

        const countries = await CountryModel.findAll({
            where: { id: userIds },
            attributes: ["id", "name"]
        });

        const supervisors = await User.findAll({
            where: { id: userIds },
            attributes: ["id", "first_name", "last_name"]
        });

        const tenants = await Tenant.findAll({
            where: { id: tenantIds },
            attributes: ["id", "name", "type"]
        });

        // Get hierarchy and work location IDs
        const hierarchyIds = userMappings.flatMap(mapping => mapping.user?.associate_hierarchy_ids || []);
        const workLocationIds = userMappings.flatMap(mapping => mapping.user?.work_location_ids || []);

        // Fetch related hierarchies and work locations
        const hierarchies = hierarchyIds.length > 0
            ? await Hierarchies.findAll({
                where: { id: hierarchyIds },
                attributes: ["id", "name"]
            }) : [];

        const workLocations = workLocationIds.length > 0
            ? await WorkLocationModel.findAll({
                where: { id: workLocationIds },
                attributes: ["id", "name"]
            }) : [];

        // Enrich userMappings with related data
        const enrichedMappings = userMappings.map(mapping => {
            const user = users.find((u: { id: any; }) => u.id === mapping.user_id);
            const tenantForMapping = tenants.find(t => t.id === mapping.tenant_id);

            if (user) {
                // Enrich user with hierarchy and work location data
                user.associate_hierarchy_ids = hierarchies.filter(hierarchy =>
                    user.associate_hierarchy_ids.includes(hierarchy.id)
                ).map(hierarchy => ({
                    id: hierarchy.id,
                    name: hierarchy.name
                }));

                user.work_location_ids = workLocations.filter(location =>
                    user.work_location_ids.includes(location.id)
                ).map(location => ({
                    id: location.id,
                    name: location.name
                }));

                user.default_hierarchy_id = hierarchies.find(hierarchy =>
                    hierarchy.id === user.default_hierarchy_id
                );

                user.default_work_location_id = workLocations.find(location =>
                    location.id === user.default_work_location_id
                );
            }

            // Find countries and supervisors for the user
            const userCountries = countries.filter(c => c.user_id === user?.id);
            const supervisor = supervisors.find(s => s.id === user?.supervisor_id);

            return {
                ...mapping.toJSON(),
                user: {
                    ...user?.toJSON(),
                    associate_hierarchy_ids: user?.associate_hierarchy_ids,
                    work_location_ids: user?.work_location_ids,
                    default_hierarchy_id: user?.default_hierarchy_id,
                    default_work_location_id: user?.default_work_location_id,
                },
                tenant: tenantForMapping,
                countries: userCountries,
                supervisor: supervisor
            };
        });

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: "User mappings records fetched successfully.",
            user_mappings: enrichedMappings
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
