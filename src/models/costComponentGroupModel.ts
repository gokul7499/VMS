import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programsModel";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";

class CostComponentGroup extends Model { }

CostComponentGroup.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        created_on: {
            type: DataTypes.DOUBLE,
        },
        modified_on: {
            type: DataTypes.DOUBLE,
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        modified_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "programs",
                key: "id",
            },
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        cost_component_ids: {
            type: DataTypes.JSON,
            allowNull: true
        },
        meta_data: {
            type: DataTypes.JSON,
            allowNull: true,
        }
    },
    {
        sequelize,
        tableName: "cost_component_group",
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
CostComponentGroup.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

export default CostComponentGroup;
