import { Op } from "sequelize";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "./genrateTraceId";
import { sequelize } from "../config/instance";

export class BaseService {
    private model: any;

    constructor(model: any) {
        this.model = model;
    }

    async createData(request: FastifyRequest) {
        const data = request.body;
        const result = await this.model.create(data);
        return result;
    }

    async updateById(request: FastifyRequest, searchFields: Record<string, string>) {
        const data = request.body;
        const [updatedCount] = await this.model.update(data, {
            where: {
                ...searchFields,
                is_deleted: false
            }
        });

        return updatedCount;
    }

    async getByIdAndPopulate(request: FastifyRequest, searchFields: Record<string, string>, responseFields: string[] | undefined = undefined, include?: any[]) {

        const queryOptions: any = {
            where: {
                ...searchFields,
                is_deleted: false
            },
            include: include,
        };

        if (responseFields) {
            queryOptions.attributes = responseFields;
        }

        const result = await this.model.findOne(queryOptions);
        return result;
    }

    async deleteById(searchFields: Record<string, string>) {
        const [deletedCount] = await this.model.update(
            {
                is_deleted: true,
                is_enabled: false,
            },
            {
                where: {
                    ...searchFields,
                    is_deleted: false
                }
            }
        );

        return deletedCount;
    }

    async getAllByCriteriaPopulate(request: FastifyRequest, query: { [key: string]: any },
        pagination: { page: number; limit: number } = { page: 1, limit: 10 },
        responseFields?: string[], include?: any[]
    ) {

        const offset = Number(pagination.limit) * (Number(pagination.page) - 1);
        const limit = Number(pagination.limit);

        const cleanedQuery: { [key: string]: any } = { is_deleted: false };
        Object.keys(query).forEach((key) => {
            const value = query[key];
            if (value !== undefined && value !== null && value !== '') {
                if (key === 'is_enabled') {
                    cleanedQuery[key] = value === "true" ? 1 : 0;
                } else if (typeof value === 'string' && !value.includes('%')) {
                    cleanedQuery[key] = { [Op.like]: `%${value}%` };
                } else if (typeof value === 'string' && value.includes('%')) {
                    cleanedQuery[key] = { [Op.like]: value };
                } else {
                    cleanedQuery[key] = value;
                }
            }
        });

        const sortField = query.sortField || "created_on";
        const sortDirection = query.sortDirection || "DESC";
        const validSortFields = [...Object.keys(cleanedQuery), "created_on"];
        const validDirections: ("ASC" | "DESC")[] = ["ASC", "DESC"];

        const finalSortField = validSortFields.includes(sortField) ? sortField : "created_on";
        const finalSortDirection = validDirections.includes(sortDirection as "ASC" | "DESC") ? sortDirection : "DESC";

        const options: any = {
            where: cleanedQuery,
            offset: offset,
            limit: limit,
            distinct: true,
            order: [[finalSortField, finalSortDirection]],
            include: include,
        };

        if (query.info_level !== 'detail' && responseFields && responseFields.length > 0) {
            options.attributes = responseFields;
        }

        const results = await this.model.findAndCountAll(options);

        return results;
    }

    async advancedFilter(request: FastifyRequest, program_id: string, include?: any[]) {
        const { filters = {}, pagination } = request.body as {
          filters?: Record<string, any>;
          pagination?: { page?: number; limit?: number };
        };
              const whereCondition: { [key: string]: any } = { 
          is_deleted: false,
          program_id 
        };
      
        // Loop through the filters provided by the user
        Object.keys(filters).forEach((field) => {
          const value = filters[field];
      
          if (Array.isArray(value)) {
            if (value.length === 2 && !isNaN(Date.parse(value[0])) && !isNaN(Date.parse(value[1]))) {
              // Handle date range filters
              whereCondition[field] = {
                [Op.between]: [new Date(value[0]), new Date(value[1])]
              };
            } else if (value.length > 0) {
              whereCondition[field] = sequelize.where(
                sequelize.fn('JSON_CONTAINS', sequelize.col(field), JSON.stringify(value)),
                true
              );
            }
          } else if (typeof value === "boolean") {
            // Handle boolean values (e.g., is_active)
            whereCondition[field] = value;
          } else if (typeof value === "string") {
            // Handle string values (e.g., title)
            whereCondition[field] = {
              [Op.like]: `%${value}%`
            };
          } else if (typeof value === "number") {
            // Handle exact numeric values
            whereCondition[field] = value;
          } else if (value instanceof Date || !isNaN(Date.parse(value))) {
            // Handle single date values
            whereCondition[field] = {
              [Op.eq]: new Date(value)
            };
          }
        });
      
        // Handle pagination
        const offset = pagination?.page ? (pagination.page - 1) * (pagination.limit ?? 10) : undefined;
        const limit = pagination?.limit ?? undefined;
      
        const options: any = {
          where: whereCondition,
          distinct: true,
          order: [["created_on", "DESC"]],
          include: include
        };
        
        if (offset !== undefined && limit !== undefined) {
          options.offset = offset;
          options.limit = limit;
        }
      
        const results = await this.model.findAndCountAll(options);
        return results;
      }
      

}

export async function baseSearch(
    request: FastifyRequest,
    reply: FastifyReply,
    model: any,
    searchFields: string[],
    responseFields: string[]
) {
    const query = request.query as Record<string, string>;
    const params = request.params as Record<string, string>;

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortField = query.sortField || "created_on";
        const finalSortDirection = "DESC";

    try {
        let searchConditions: any = {};

        const combinedSearch = { ...params, ...query };

        searchFields.forEach(field => {
            if (combinedSearch[field]) {
                if (field === "is_enabled") {
                    searchConditions[field] = combinedSearch[field] === "true" ? 1 : 0;
                } else {
                    searchConditions[field] = { [Op.like]: `%${combinedSearch[field].trim()}%` };
                }
            }
        });

        let attributes: string[] | undefined = responseFields;
        if (query.info_level === "detail") {
            attributes = undefined;
        }

        const { rows: results, count } = await model.findAndCountAll({
            where: {
                ...searchConditions,
                is_deleted: false,
            },
            limit: limit,
            offset: offset,
            attributes: attributes,
            order: [[sortField, finalSortDirection]], 
        });

        return reply.status(200).send({
            status_code: 200,
            total_records: count,
            items: results,
        });

    } catch (error) {
        console.error(error);
        return reply.status(500).send({ message: "Internal Server Error" });
    }
}


export async function advanceSearch(
    request: FastifyRequest,
    reply: FastifyReply,
    model: any,
    searchFields: string[],
    responseFields: string[]
) {
    const body = request.body as Record<string, any>;

    try {
        const whereCondition: { [key: string]: any } = {};
        searchFields.forEach(field => {
            if (body.hasOwnProperty(field)) {
                if (Array.isArray(body[field])) {
                    if (body[field].length === 2) {
                        whereCondition[field] = {
                            [Op.between]: [new Date(body[field][0]), new Date(body[field][1])]
                        };
                    }
                } else if (typeof body[field] === "string" && field !== "is_enabled") {
                    whereCondition[field] = { [Op.like]: `%${body[field].trim()}%` };
                } else if (field === "is_enabled") {
                    whereCondition[field] = body[field] === "true" ? 1 : 0;
                } else {
                    whereCondition[field] = body[field];
                }
            }
        });

        const results = await model.findAll({
            where: whereCondition,
            attributes: responseFields
        });

        if (results.length > 0) {
            return reply.status(200).send({
                status_code: 200,
                data: results,
                trace_id: generateCustomUUID(),
            });
        } else {
            return reply.status(200).send({ message: "No records found" });
        }

    } catch (error) {
        console.error(error);
        return reply.status(500).send({ message: "Internal Server Error" });
    }
}