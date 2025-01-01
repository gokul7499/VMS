import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";

class FieldOperator extends Model { }

FieldOperator.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        sign: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        eval_text: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_separator: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
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
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: "field-operator",
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
export default FieldOperator;
