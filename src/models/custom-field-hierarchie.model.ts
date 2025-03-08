import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { Programs } from './programs.model';

class CustomFieldHierarchie extends Model {
  hierarchy_id: any;
  id: any;
  custom_field_id: any;
  work_location_id: any;
}

CustomFieldHierarchie.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    custom_field_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    hierarchy_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'programs',
        key: 'id',
      },
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true
    },
    updated_on: {
      type: DataTypes.DATE,
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
    tableName: 'custom_fields_hierarchie',
    timestamps: false,
    hooks: {
      beforeValidate: convertEmptyStringsToNull,
      beforeSave: beforeSave,
    },
  }
);

CustomFieldHierarchie.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });

export default CustomFieldHierarchie;
