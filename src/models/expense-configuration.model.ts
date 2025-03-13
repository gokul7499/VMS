import { Model, DataTypes } from 'sequelize';
import { sequelize } from "../config/instance";
import { Programs } from './programs.model';

class ExpenseConfigurationModel extends Model {
  id: any;
  foundational_data_type_id: any;
  name: any;
  code: any;
  hierarchy: any;
  status!: any;
  expense_item_type_config: any;
    master_data: any;
}

ExpenseConfigurationModel.init(

  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "programs",
        key: "id",
      },
    },
    enable_thresholds:{
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    weekending_day: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mdt_display_headers:{
      type:DataTypes.JSON,
      allowNull:true
    },
    misc_exp_access_rules: {
      type: DataTypes.JSON,
      allowNull: true
    },
    general_exp_access_rules: {
      type: DataTypes.JSON,
      allowNull: true
    },
    revoke_worker_access: {
      type: DataTypes.JSON,
      allowNull: true
    },
    general_exp_incurred_submission:{
      type: DataTypes.JSON,
      allowNull: true
    },
    project: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull: true,
    },
    updated_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull: true,
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
    tableName: 'expense_config',
    timestamps:false,
  }
);
ExpenseConfigurationModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });

sequelize.sync();

export default ExpenseConfigurationModel;
