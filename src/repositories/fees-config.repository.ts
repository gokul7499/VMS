import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

class FeesConfigRepository {

    static async getFeesConfig(program_id: string, hierarchy_levels: any, labor_category: any, vendors: any) {
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
            type: QueryTypes.SELECT
        });

        return result;
    }
}

export default FeesConfigRepository;