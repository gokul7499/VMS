import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import SowTempleteModel from './sow_template.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import CustomField from './custom-fields.model';

class SowTemplateCustomFieldsModel extends Model {
    id: any;
    created_on!: string;
    updated_on!: string;
    custom_field_id: any;
    value: any;
}

SowTemplateCustomFieldsModel.init(
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
                model: "sow_templates",
                key: "id",
            },
        },
        custom_field_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references:{
                model:CustomField,
                key:'id'
            }
        },
        value: {
            type: DataTypes.STRING,
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
        tableName: 'sow_template_custom_fields',
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);

            },
        },

    });

sequelize.sync();
SowTemplateCustomFieldsModel.belongsTo(SowTempleteModel, { foreignKey: 'sow_template_id', as: 'sow_templates' });

export default SowTemplateCustomFieldsModel;
