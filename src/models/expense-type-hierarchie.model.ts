import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import ExpenseConfigurationModel from './expense-configuration.model';
import Hierarchies from './hierarchies.model';

class expenseTypeHierarchie extends Model {
    hierarchy: never[] | undefined; 

}

expenseTypeHierarchie.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        hierarchy:{
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: Hierarchies,
                key: 'id',
            },
        },
        expense_config_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'expense_configuration',
                key: 'id',
            },
        },
        created_on: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: true
        },
        updated_on: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
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
        tableName: 'expense_type_hierarchies',
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

expenseTypeHierarchie.belongsTo(ExpenseConfigurationModel, { foreignKey: 'expense_config_id', as: 'expense_configuration' });
expenseTypeHierarchie.belongsTo(Hierarchies, { foreignKey: 'hierarchy', as: 'hierarchies' });

export default expenseTypeHierarchie;
