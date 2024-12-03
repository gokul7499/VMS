import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programsModel';
import CustomField from './customFieldsModel';
import hierarchies from './hierarchiesModel';

class HierarchyCustomFieldModel extends Model {
  id: any;

}

HierarchyCustomFieldModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Programs,
        key: 'id',
      },
    },
    customfield_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "custom_fields",
        key: 'id',
      },
    },
    value: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_on: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    hierarchy_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "hierarchies",
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'HierarchyCustomFieldModel',
    tableName: 'hierarchy_customfields',
    timestamps: false,
  }
);

// Define associations
HierarchyCustomFieldModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
HierarchyCustomFieldModel.belongsTo(CustomField, { foreignKey: 'customfield_id', as: 'customField' });
HierarchyCustomFieldModel.belongsTo(hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchy' });

export default HierarchyCustomFieldModel;
