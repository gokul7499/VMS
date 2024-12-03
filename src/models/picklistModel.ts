import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/instance';
import picklistAttributes from '../interfaces/picklistInterface';
import picklistItemModel from './picklistItemModel';
import { Programs } from './programsModel';
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

interface picklistCreationAttributes extends Optional<picklistAttributes, 'id'> { }

class picklistModel extends Model<picklistAttributes, picklistCreationAttributes> implements picklistAttributes {
  public id!: string;
  public picklist_id!: string | null;
  public name!: string;
  public program_id!: string;  // This will be replaced by program_id in the future. For now, it's kept for compatibility with existing data.  // TODO: Remove this field when we have program_id in place.  // TODO: Make sure this field is not nullable when program_id is added.  // TODO: Add validation to ensure program_id exists in programs table.  // TODO: Add validation to ensure program_id is a valid UUID
  public description!: string | null;
  public is_enabled!: boolean;
  public is_deleted!: boolean;
  public created_on!: number;
  public modified_on!: number;
  public created_by!: string | null;
  public modified_by!: string | null;
  public defined_by!: string;
  public multiselect!: boolean;
  public slug?: string | null;
  public disabled_program?: object | null;
  public is_visible!: boolean;
  picklistItems: any;

  static findByIdAndUpdate(picklistId: any, updates: unknown, arg2: { new: boolean; }) {
    throw new Error('Method not implemented.');
  }
}

picklistModel.init({
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
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  created_on: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  modified_on: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.CHAR(36),
    allowNull: true,
  },
  modified_by: {
    type: DataTypes.CHAR(36),
    allowNull: true,
  },
  defined_by: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  multiselect: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  disabled_program: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'picklist',
  timestamps: false,
  hooks: {
    beforeValidate: convertEmptyStringsToNull,
    beforeSave: (instance) => {
      beforeSave(instance);
    },
  },
});

// Define the relationship
picklistModel.hasMany(picklistItemModel, {
  foreignKey: 'picklist_id',
  as: 'picklistItems'
});

picklistItemModel.belongsTo(picklistModel, {
  foreignKey: 'picklist_id',
  as: 'picklist'
});

sequelize.sync()

picklistModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
export default picklistModel;
