import { DataTypes, Model } from 'sequelize';
import { sequelize } from "../config/instance";
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from './programs.model';
import VendorDistributionSchedule from './vendor-distribution-schedule.model';
import jobTemplateModel from './job-template.model';

class JobTemplateDistScheduleModel extends Model {
  id: any;
}

JobTemplateDistScheduleModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    job_temp_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'job_templates',
        key: 'id',
      },
    },
    dist_shedule_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'vendor_distribution_schedules',
        key: 'id',
      },
    },
    schedule_value: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    schedule_unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vendors: {
      type: DataTypes.JSON,
      allowNull: false
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Programs,
        key: 'id',
      },
    },
    created_on: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    updated_on: {
      type: DataTypes.DOUBLE,
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
    modelName: 'job_template_dist_schedules',
    timestamps: false,
    hooks: {
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    },
  });

sequelize.sync();
JobTemplateDistScheduleModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobTemplateDistScheduleModel.belongsTo(VendorDistributionSchedule, { foreignKey: 'dist_shedule_id', as: 'dist_schedule_detail' });
JobTemplateDistScheduleModel.belongsTo(jobTemplateModel, { foreignKey: 'job_temp_id', as: 'job_templates' })
export default JobTemplateDistScheduleModel;