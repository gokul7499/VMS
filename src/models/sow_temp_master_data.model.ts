import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance'
import SowTempleteModel from './sow_templete.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';


class SowTempleteMasterDataModel extends Model {
    id: any;
    created_on!: string;
    updated_on!: string;
    master_data_type_id: any;
    master_data: any;
}
SowTempleteMasterDataModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        sow_template_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: SowTempleteModel,
                key: "id",
            },
        },
        master_data_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        master_data: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        created_on: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_on: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
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
        tableName: 'sow_template_master_data',
        timestamps: false,
    });

sequelize.sync();
SowTempleteMasterDataModel.belongsTo(SowTempleteModel, { foreignKey: 'sow_template_id', as: 'sow_templates' });
export default SowTempleteMasterDataModel;
