import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

class AccuracyConfiguration {
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
                WHERE program_id = :program_id AND title = :config_model
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

        const accuracyConfigRecord = configData.find(
            (item) =>
                item.title === "Accuracy Configuration" &&
                item.config_model === "platform"
        );
        const isAccuracyEnabled = accuracyConfigRecord?.value == true;
        
        const amountObject = configData
            .find((item) => item.config_model === "accuracy_configuration")
            ?.value.find((val: { title: string }) => val.title === title);

        if (!amountObject || !Array.isArray(amountObject.fields)) {
            console.warn("Warning: 'Amount' configuration not found or has no fields");
            return amount.toString();
        }

        const allFields = amountObject.fields.flatMap((group: { fields: any[] }) =>
            Array.isArray(group.fields) ? group.fields : []
        );

        const scaleLimit = isAccuracyEnabled ? parseInt(allFields[1].value, 10) : 4;
        const threshold = isAccuracyEnabled ? parseInt(allFields[2].value, 10) : 4;
        const scalingType = allFields[0].value;

        const factor = Math.pow(10, scaleLimit);

        switch (scalingType) {
            case 'Round Up':
                return AccuracyConfiguration.roundUp(amount, threshold, scaleLimit, factor).toFixed(scaleLimit);
            case 'Round Down':
                return AccuracyConfiguration.roundDown(amount, threshold, scaleLimit, factor).toFixed(scaleLimit);
            case 'Truncate':
                return AccuracyConfiguration.truncate(amount, scaleLimit, factor).toFixed(scaleLimit);
            default:
                return amount.toFixed(scaleLimit);
        }
    }

    private static roundUp(value: number, threshold: number, scaleLimit: number, factor: number): number {
        let roundedValue = Math.ceil(value * factor) / factor;

        if (threshold && (value * factor - Math.floor(value * factor)) * 10 >= threshold) {
            roundedValue = (Math.ceil(value * factor) + 1) / factor;
        }
        return roundedValue;
    }

    private static roundDown(value: number, threshold: number, scaleLimit: number, factor: number): number {
        let roundedValue = Math.floor(value * factor) / factor;

        if (threshold && (value * factor - Math.floor(value * factor)) * 10 <= threshold) {
            roundedValue = (Math.floor(value * factor) - 1) / factor;
        }
        return roundedValue;
    }

    private static truncate(value: number, scaleLimit: number, factor: number): number {
        return Math.floor(value * factor) / factor;
    }

}

export default AccuracyConfiguration;