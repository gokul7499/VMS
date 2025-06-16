import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { FastifyRequest } from "fastify";

class FeesConfigRepository {
  static async getFeesConfig(program_id: string,hierarchy_levels: any, labor_category: any, vendors: any) {
    let result: any;
    let sql: any;

    sql = `
            SELECT * FROM fees WHERE program_id = :program_id
            AND JSON_CONTAINS(fees.hierarchy_levels, :hierarchies)
            AND JSON_CONTAINS(fees.labor_category, :labor_category)
            AND JSON_CONTAINS(fees.vendors, :vendors)
        `;

    const replacements = {
      program_id,
      hierarchies: JSON.stringify(hierarchy_levels),
      labor_category: JSON.stringify(labor_category),
      vendors: JSON.stringify(vendors),
    };

    // Log SQL query with replacement values
    console.log("SQL Query:", sql);
    console.log("Replacement Values:", JSON.stringify(replacements, null, 2));

    result = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return result;
  }

  static async advancedFilter(
    request: FastifyRequest,
    program_id: string,
    paginationOverride?: { page?: number; limit?: number }
  ) {
    const { filters = {}, pagination } = request.body as {
      filters?: Record<string, any>;
      pagination?: { page?: number; limit?: number };
    };

    const page = paginationOverride?.page || pagination?.page || 1;
    const limit = paginationOverride?.limit || pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const whereClause: string[] = [
      "fees.is_deleted = false",
      "fees.program_id = :program_id",
    ];
    const replacements: Record<string, any> = { program_id };

    // JSON filters
    if (filters.hierarchy_levels) {
      whereClause.push("JSON_CONTAINS(fees.hierarchy_levels, :hierarchies)");
      replacements.hierarchies = JSON.stringify(filters.hierarchy_levels);
    }

    if (filters.labor_category) {
      whereClause.push("JSON_CONTAINS(fees.labor_category, :labor_category)");
      replacements.labor_category = JSON.stringify(filters.labor_category);
    }

    if (filters.vendors) {
      whereClause.push("JSON_CONTAINS(fees.vendors, :vendors)");
      replacements.vendors = JSON.stringify(filters.vendors);
    }

    // String filter with partial match
    if (filters.source_model) {
      whereClause.push("fees.source_model LIKE :source_model");
      replacements.source_model = `%${filters.source_model[0]}%`;
    }

    // Boolean filter
    if (filters.is_enabled !== undefined) {
      whereClause.push("fees.is_enabled = :is_enabled");
      replacements.is_enabled = filters.is_enabled;
    }

    // Title (partial match)
    if (filters.title) {
      whereClause.push("fees.title LIKE :title");
      replacements.title = `%${filters.title}%`;
    }

    // Date range filter
    if (filters.updated_on && Array.isArray(filters.updated_on)) {
      const [startDate, endDate] = filters.updated_on;

      if (startDate) {
        whereClause.push("fees.updated_on >= :start_date");
        replacements.start_date = startDate;
      }

      if (endDate) {
        whereClause.push("fees.updated_on <= :end_date");
        replacements.end_date = endDate;
      }
    }

    // Construct WHERE clause
    const whereSql = whereClause.length
      ? `WHERE ${whereClause.join(" AND ")}`
      : "";

    // Query for data
    const sql = `
      SELECT * FROM fees
      ${whereSql}
      LIMIT :limit OFFSET :offset
    `;

    // Query for total count
    const countSql = `
      SELECT COUNT(*) as total FROM fees
      ${whereSql}
    `;

    replacements.limit = limit;
    replacements.offset = offset;

    const rows = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const countResult: any = await sequelize.query(countSql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const count = countResult[0]?.total || 0;

    return { count, rows };
  }
}

export default FeesConfigRepository;
