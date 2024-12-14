import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { Programs } from './programsModel';
import { rateType } from './rate-type.model';

class RateTypeJobTemplate extends Model { }

RateTypeJobTemplate.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  program_id: {
    type: DataTypes.UUID,
    references: {
      model: Programs,
      key: 'id',
    },
    allowNull: true
  },
  rate_type_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: rateType,
      key: 'id',
    },
  },
  job_template_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  is_excluded: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
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
    type: DataTypes.UUID,
    allowNull: true,
  },
  modified_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  }
}, {
  sequelize,
  tableName: 'rate_type_job_template',
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

RateTypeJobTemplate.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
RateTypeJobTemplate.belongsTo(rateType, { foreignKey: 'rate_type_id', as: 'rate_type' });
export default RateTypeJobTemplate;