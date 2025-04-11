import { Model, DataTypes } from 'sequelize';
import { sequelize } from "../config/instance";
import { Programs } from './programs.model';

class ExpenseConfigurationModel extends Model {
   
    id: unknown;
    hierarch_ids: any;
    expense_type_ids: any;
    
    updated_by: any;

}
ExpenseConfigurationModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "programs",
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hierarch_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    expense_type_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    weekending_day: {
      type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
      allowNull: true,
    },
    mdt_display_headers: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    projects: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_thresholds_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    general_exp_duration_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    worker_access_revoke_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    misc_exp_entry_rules: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    general_exp_entry_rules: {
      type: DataTypes.JSON,
      allowNull: true,
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
      type: DataTypes.DOUBLE,
      defaultValue: Date.now(),
      allowNull: true,
    },
    updated_on: {
      type: DataTypes.DOUBLE,
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
    timestamps: false,
  }
);
ExpenseConfigurationModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
sequelize.sync();

export default ExpenseConfigurationModel;
