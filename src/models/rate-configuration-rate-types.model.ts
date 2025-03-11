import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import rateType from "./rate-type.model";

class RateConfigurationRateTypes extends Model {
    id: any;
    rate_type: any;
    bill_rate: any;
}

RateConfigurationRateTypes.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        base_rate_type_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        rate_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: rateType,
                key: 'id',
            }
        },
        created_on: {
            type: DataTypes.DOUBLE,
            defaultValue: DataTypes.NOW,
            allowNull: true
        },
        updated_on: {
            type: DataTypes.DOUBLE,
            defaultValue: DataTypes.NOW,
            allowNull: true
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "rate_configuration_rate_types",
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
RateConfigurationRateTypes.belongsTo(rateType, { foreignKey: 'rate_type_id', as: 'rate_type' });
export default RateConfigurationRateTypes;