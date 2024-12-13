import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import ExpenseConfigurationModel from './expense-configuration.model';

class ExpenseType extends Model { }

ExpenseType.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        expense_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        expense_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        expense_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        expense_icon: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        attachment_mandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        notes_mandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        msp_applicable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        unit_base: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        unit_base_config: {
            type: DataTypes.JSON,
            allowNull: true,
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
        allow_negative_expenses: {
            type: DataTypes.BOOLEAN,
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
            defaultValue: DataTypes.NOW
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            defaultValue: DataTypes.NOW
        }
    },
    {
        sequelize,
        tableName: 'expense_type',
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

ExpenseType.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
ExpenseType.belongsTo(ExpenseConfigurationModel, { foreignKey: 'expense_config_id', as: 'expense_configuration' });

export default ExpenseType;
