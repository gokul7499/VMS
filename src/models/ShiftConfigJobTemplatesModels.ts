import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';


class ShiftConfigJobTemplate extends Model {
  id: any;
  shift_config_id: any;
  job_template_ids: any;
  job_template_id: any
}

ShiftConfigJobTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    shift_config_id: {
      type: DataTypes.UUID,
      allowNull: true,

    },
    job_template_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'shift_config_job_template',
    timestamps: false,

  }
);



// Associations
// ShiftConfigJobTemplate.belongsTo(ShiftConfig, { foreignKey: 'shift_config_id', as: 'shiftConfig' });
sequelize.sync();

export default ShiftConfigJobTemplate;