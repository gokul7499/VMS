import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from "../config/instance";
import { Programs } from './programsModel';

class ExpenseConfigurationModel extends Model {
  id: any;
  foundational_data_type_id: any;
  name: any;
  code: any;
  hierarchy: any;
  status!: any;
  expense_type: any;
}

ExpenseConfigurationModel.init(

  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    config_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.BOOLEAN,
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
    hierarchy: {
      type: DataTypes.JSON,
      allowNull: true
    },
    expense_start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    week_end_day: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_expense: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    is_taxable: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    user_role: {
      type: DataTypes.JSON,
      allowNull: true
    },
    expense_header: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_permission: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    permission_config: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_project: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    project_config: {
      type: DataTypes.JSON,
      allowNull: true
    },
    expense_type: {
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
      type: DataTypes.DOUBLE,
      defaultValue: Date.now(),
      allowNull: false,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
      defaultValue: Date.now(),
      allowNull: false,
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
    tableName: 'expense_configuration'
  }
);
ExpenseConfigurationModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });

sequelize.sync();

export default ExpenseConfigurationModel;
