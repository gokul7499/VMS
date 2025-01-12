import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from "../hooks/timeFormatHook";

class shiftTypeConfiguration extends Model {
  shift_type_id: any;
  shift_config_id: string | undefined;
  id: any;
}

shiftTypeConfiguration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    shift_config_id: {
      type: DataTypes.UUID,
      allowNull: true,

    },
    shift_type_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
  },
  {
    sequelize,
    tableName: 'shift_type_configurations',
    timestamps: false,
    hooks: {
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    }
  }
);

sequelize.sync();

export default shiftTypeConfiguration;