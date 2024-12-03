import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import picklistModel from './picklistModel';
import { Programs } from './programsModel';

class picklistItemModel extends Model {
  id: any;
  // Define any instance methods or custom logic here if needed
}

picklistItemModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  program_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'programs',
      key: 'id',
    },
  },
  picklist_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: picklistModel,
      key: 'id',
    },
  },
  label: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  defined_by: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  created_on: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  modified_on: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.CHAR(36),
    allowNull: true,
  },
  modified_by: {
    type: DataTypes.CHAR(36),
    allowNull: true,
  },
  value: {
    type: DataTypes.CHAR(255),
    allowNull: true,
  },
  disabled_program: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  label_program: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  meta_data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

}, {
  sequelize,
  modelName: 'picklistitem',
  timestamps: false,
});

// Associations should be defined here if not already done
// PicklistItemModel.belongsTo(picklistModel, {
//   foreignKey: 'parent_id',
//   as: 'picklist'
// });

picklistItemModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });

export default picklistItemModel;
