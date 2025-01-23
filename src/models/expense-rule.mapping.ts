import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import TimesheetExpenseRuleModel from './timesheet-expense-rule.model';

class ExpenseRuleMapping extends Model {
    expense_rule_id: any; 
 
}

ExpenseRuleMapping.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        expense_rule_group_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        expense_rule_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: TimesheetExpenseRuleModel,
                key: 'id',
            },
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id',
            },
        },
        created_on: {
            type: DataTypes.DOUBLE,
            defaultValue: DataTypes.NOW
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            defaultValue: DataTypes.NOW
        }
    },
    {
        sequelize,
        tableName: 'expense_rule_mapping',
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

ExpenseRuleMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
ExpenseRuleMapping.belongsTo(TimesheetExpenseRuleModel, { foreignKey: 'expense_rule_id', as: 'expense_rule' });

export default ExpenseRuleMapping;
