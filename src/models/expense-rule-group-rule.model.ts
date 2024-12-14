import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import TimesheetExpenseRuleModel from "./timesheet-expense-rule.model";
import { Programs } from "./programs.model";

class ExpenseRuleGroupRuleModel extends Model {
    timesheet_expense_rule: any;
}

ExpenseRuleGroupRuleModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        timesheet_expense_rule_group_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        program_id:{
            type:DataTypes.UUID,
            allowNull:false,
            references:{
                model:Programs,
                key:'id'
            }
        },
        timesheet_expense_rule_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: TimesheetExpenseRuleModel,
                key: 'id'
            }
        },
        rule_type:{
            type:DataTypes.STRING,
            allowNull:true
        },
        is_enabled:{
            type:DataTypes.BOOLEAN,
            allowNull:false
        },
        created_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: Date.now(),
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: Date.now(),
        },
    },
    {
        sequelize,
        timestamps: false,
        modelName: "timesheet_expense_group_rule"
    }
);
ExpenseRuleGroupRuleModel.belongsTo(TimesheetExpenseRuleModel, { foreignKey: 'timesheet_expense_rule_id', as: 'timesheet_expense_rule' });
ExpenseRuleGroupRuleModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
export default ExpenseRuleGroupRuleModel;
