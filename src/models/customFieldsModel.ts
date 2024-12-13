import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { Programs } from './programs.model';
import { Module } from './moduleModel';


class CustomField extends Model {
  id: any;
  is_linked: never[] | undefined;
  linked_modules: any;
  is_all_hierarchy: any;
  is_all_work_location: any;
  static readonly id: any;
  name: any;
  field_type: any;
  label: any;
  slug: any;
  placeholder: any;
  meta_data: any;
  supporting_text: any;
  description: any;
  is_readonly: any;
  is_required: any;
  is_enabled: any;
  is_deleted: any;
  can_view: any;
  can_edit: any;
  job_type: any;
  module_name: any;
  module_id: any;
  modified_on: any;
  created_on: any;
  program_id: any;
}

CustomField.init(
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
        model: 'programs',
        key: 'id',
      },
    },
    field_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    placeholder: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    meta_data: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    is_all_work_location: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_all_hierarchy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    supporting_text: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_readonly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_linked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    created_on: {
      type: DataTypes.DOUBLE,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
    },
    module_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references:
      {
        model: 'module',
        key: 'id',
      },
    },
    module_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    can_view: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    can_edit: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    job_type: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    linked_modules: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
  },
  {
    sequelize,
    tableName: 'custom_fields',
    timestamps: false,
    hooks: {
      beforeValidate: convertEmptyStringsToNull,
      beforeSave: beforeSave,
    },
  }
);

CustomField.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
CustomField.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });


export default CustomField;
