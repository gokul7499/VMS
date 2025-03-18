import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

interface MarkupDataInterface {
    program_id?: string,
    rate_model?: string,
    hierarchy?: Array<string>,
    program_industry?: string,
    job_type?: string,
    job_template?: string,
    rate_type?: string,
    work_location?: string,
}

class GlobalRepository {
    static async findVendorMarkups(markupDetail: MarkupDataInterface) {

        const sql = `
        SELECT
            (JSON_UNQUOTE(JSON_EXTRACT(markups, '$.sourced_markup')) AS FLOAT) AS sourced_markup_min,
            (JSON_UNQUOTE(JSON_EXTRACT(markups, '$.payrolled_markup')) AS FLOAT) AS payrolled_markup_max
        FROM
            vendor_markup_config vmc
        WHERE
            AND vmc.program_id = :program_id
            AND (vmc.rate_model = :rate_model OR vmc.rate_model IS NULL)
            AND (vmc.hierarchy IN (:hierarchy) OR vmc.hierarchy IS NULL)
            AND (vmc.program_industry = :program_industry OR vmc.program_industry IS NULL)
            AND (vmc.job_type = :job_type OR vmc.job_type IS NULL)
            AND (vmc.job_template = :job_template OR vmc.job_template IS NULL)
            AND (vmc.rate_type = :rate_type OR vmc.rate_type IS NULL)
            AND (vmc.work_location = :work_location OR vmc.work_location IS NULL)
        LIMIT 1`;

        const markupData = await sequelize.query(sql, {
            replacements: { program_id: markupDetail.program_id, program_industry: markupDetail.program_industry, hierarchy: markupDetail.hierarchy, rate_model: markupDetail.rate_model },
            type: QueryTypes.SELECT,
            raw: true,
        });

        return markupData;
    }

    static async accuracyConfiguration(program_id: string, config_model: string): Promise<any[]> {
        try {
            const query = `
                SELECT 
                    id,
                    program_id,
                    config_model,
                    title,
                    description,
                    \`key\`,
                    data_type,
                    \`value\`,
                    configuration_id
                FROM programs_config
                WHERE program_id = :program_id AND config_model = :config_model
            `;

            const replacements = { program_id, config_model };

            const result = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });

            if (!result.length) {
                return [];
            }

            return result as any[];
        } catch (error) {
            console.error("Error fetching configuration:", error);
            throw new Error("Failed to fetch accuracy configuration");
        }
    }

    static findAndCalculate(configData: any[], title: string, amount: number): string {
        if (!Array.isArray(configData)) {
            console.error("Error: configData is not an array or is undefined");
            return amount.toString();
        }
        if (amount === null || amount === undefined || isNaN(amount)) {
            console.log("Invalid amount provided (null, undefined, or NaN):", amount);
            return "0";
        }
        amount = Number(amount);
        if (!Number.isFinite(amount)) {
            console.log("Invalid amount provided (Not Finite):", amount);
            return amount.toString();
        }
        const amountObject = configData
            .find((item) => item.title === "Accuracy Configuration")
            ?.value.find((val: { title: string }) => val.title === title);

        if (!amountObject || !Array.isArray(amountObject.fields)) {
            console.warn("Warning: 'Amount' configuration not found or has no fields");
            return amount.toString();
        }

        const allFields = amountObject.fields.flatMap((group: { fields: any[] }) =>
            Array.isArray(group.fields) ? group.fields : []
        );

        const scaleLimit = parseInt(allFields[1].value, 10);
        const threshold = parseInt(allFields[2].value, 10);
        const scalingType = allFields[0].value;

        const factor = Math.pow(10, scaleLimit);
        switch (scalingType) {
            case 'Round Up':
                return GlobalRepository.roundUp(amount, threshold, scaleLimit, factor).toString();
            case 'Round Down':
                return GlobalRepository.roundDown(amount, threshold, scaleLimit, factor).toString();
            case 'Truncate':
                return GlobalRepository.truncate(amount, scaleLimit, factor).toString();
            default:
                return amount.toString();
        }
    }

    private static roundUp(value: number, threshold: number, scaleLimit: number, factor: number): number {
        let roundedValue = Math.ceil(value * factor) / factor;
 
        if (threshold && value * factor - Math.floor(value * factor) >= threshold / 10) {
            roundedValue = (Math.ceil(value * factor) + 1) / factor;
        }
        return roundedValue;
       
    }
 
    private static roundDown(value: number, threshold: number, scaleLimit: number, factor: number): number {
        let roundedValue = Math.floor(value * factor) / factor;
 
        if (threshold && value * factor - Math.floor(value * factor) <= threshold / 10) {
            roundedValue = (Math.floor(value * factor) - 1) / factor;
        }
 
        return roundedValue;
    }
 
    private static truncate(value: number, scaleLimit: number, factor: number): number {
        return Math.floor(value * factor) / factor;
    }
}

export default GlobalRepository;