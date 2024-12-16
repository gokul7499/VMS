import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';

class QualificationTypeModel extends Model {
  id: any;
  name: any;
}

QualificationTypeModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: "program"
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  created_on: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  modified_on: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.DOUBLE,
  },
  modified_by: {
    type: DataTypes.DOUBLE,
  },
  program_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'programs',
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'qualification_types',
  timestamps: false,
});

export default QualificationTypeModel;