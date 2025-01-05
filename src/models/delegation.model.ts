import { DataTypes, Model } from "sequelize";
import { Programs } from './programs.model';
import { sequelize } from "../config/instance";

class Delegation extends Model { }

Delegation.init({
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
            key: 'id'
        }
    },
    delegated_to_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    delegated_by_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    delegated_to_user_mapping_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    delegated_by_user_mapping_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    created_by: {
        type: DataTypes.STRING,
        allowNull: false
    },
    updated_by: {
        type: DataTypes.STRING,
        allowNull: false
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    created_on: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    updated_on: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    interview_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    job_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    offer_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    assignment_module: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        allowNull: false
    },
    submission_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    time_and_expense_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    rfx_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    bid_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    sow_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    },
    progress_update_module: {
        type: DataTypes.TINYINT,
        defaultValue: false,
        allowNull: false
    }
},
    {
        sequelize,
        tableName: 'delegation',
        timestamps: false,
    }
);

Delegation.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });

export default Delegation;
