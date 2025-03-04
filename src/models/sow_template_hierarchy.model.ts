import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import SowTempleteModel from './sow_templete.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';


class SowTempleteHierarchyModel extends Model {
    id: any;
    created_on!: string;
    updated_on!: string;
    hierarchy_id: any;
}

SowTempleteHierarchyModel.init(
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
        hierarchy_id: {
            type: DataTypes.UUID,
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
        tableName: 'sow_template_hierarchy',
        timestamps: false,
    });

sequelize.sync();
SowTempleteHierarchyModel.belongsTo(SowTempleteModel, { foreignKey: 'sow_template_id', as: 'sow_templates' });
export default SowTempleteHierarchyModel;
