import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programsModel";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

class RateCardModel extends Model {
    id!: string;
}

RateCardModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_shift_rate: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        hierarchies: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        job_templates: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        rate_configuration: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        program_id: {
            type: DataTypes.UUID,
            references: {
                model: "programs",
                key: "id",
            },
        },
        rate_definitions: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        expenses:{
            type:DataTypes.JSON
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        modified_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        created_on: {
            type: DataTypes.DOUBLE
        },
        modified_on: {
            type: DataTypes.DOUBLE
        },
    },
    {
        sequelize,
        tableName: "rate_card_configuration",
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    }
);

sequelize.sync();

RateCardModel.belongsTo(Programs, { foreignKey: "program_id", as: "program" });
export { RateCardModel };