import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import ExpenseConfigurationModel from './expense-configuration.model';

class ExpenseTypeMapping extends Model { 
    id:any;
    expense_type:any;
    expense_code:any;
    expense_name:any;
    is_enabled:any;
}

ExpenseTypeMapping.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        expense_type_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        expense_config_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'expense_configuration',
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
        tableName: 'expense_type_mapping',
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

ExpenseTypeMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
ExpenseTypeMapping.belongsTo(ExpenseConfigurationModel, { foreignKey: 'expense_config_id', as: 'expense_configuration' });

export default ExpenseTypeMapping;
