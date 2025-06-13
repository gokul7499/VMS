import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
class SOWTemplateMasterDataModel extends Model {
    id: any;
}

SOWTemplateMasterDataModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        sow_temp_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        sow_foundation_data_type_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        sow_foundation_data_id: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
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
        tableName: "sow_template_master_data",
        timestamps: false,
    }
);

sequelize.sync();
export default SOWTemplateMasterDataModel;