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
    week_end_day: {
      type: DataTypes.STRING,
      allowNull: true
    },
    thresholds: {
      type: DataTypes.JSON,
      allowNull: true
    },
    remove_msp_access_general: {
      type: DataTypes.JSON,
      allowNull: true
    },
    remove_user_access_misc: {
      type: DataTypes.JSON,
      allowNull: true
    },
    revoke_user_access: {
      type: DataTypes.JSON,
      allowNull: true
    },
    project: {
      type: DataTypes.JSON,
      allowNull: true
    },
    master_data:{
     type:DataTypes.JSON
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
