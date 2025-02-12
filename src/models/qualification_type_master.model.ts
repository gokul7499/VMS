import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';

class QualificationTypeMaster extends Model {
  id: any;
  name: any;
}

QualificationTypeMaster.init({
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
  modelName: 'qualification_type_master',
  timestamps: false,
});

export default QualificationTypeMaster;