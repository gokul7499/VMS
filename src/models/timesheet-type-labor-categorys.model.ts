import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import IndustriesModel from './labour-categories.model';
class TimesheetTypeLaborCategorys extends Model {
    labor_categorys: any;
}

TimesheetTypeLaborCategorys.init(
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
    labor_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references:{
        model:IndustriesModel,
        key:'id'
      }
    },
  },
  {
    sequelize,
    tableName: 'timesheet_type_config_labor_categorys',
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

TimesheetTypeLaborCategorys.belongsTo(IndustriesModel, { foreignKey: 'labor_category_id', as: 'labor_categorys' });

export default TimesheetTypeLaborCategorys;
