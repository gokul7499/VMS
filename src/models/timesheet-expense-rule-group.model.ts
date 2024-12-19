import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';

class TimesheetExpenseRuleGroup extends Model {
    id: any;
    expenseRules: any;
   
}

TimesheetExpenseRuleGroup.init(
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
                model: Programs,
                key: 'id',
            },
        },
        rule_group_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        rule_type_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        rule_category: {
            type: DataTypes.STRING,
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
            allowNull: false,
            defaultValue: Date.now(),
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: Date.now(),
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        modified_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'TimesheetExpenseRuleGroup',
        tableName: 'timesheet_expense_rule_groups',
    }
);
TimesheetExpenseRuleGroup.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
  });
  
  
export default TimesheetExpenseRuleGroup;


