import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from './programsModel';
import hierarchies from './hierarchiesModel';

class TimesheetTypeHierarchies extends Model {
  id: any;
    hierarchies: any;
}

TimesheetTypeHierarchies.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    timesheet_type_config_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    hierarchy_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references:{
        model:hierarchies,
        key:'id'
      }
    },
  },
  {
    sequelize,
    tableName: 'timesheet_type_config_hierarchies',
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    },
  }
);

TimesheetTypeHierarchies.belongsTo(hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchies' });

export default TimesheetTypeHierarchies;
