import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import ProgramModule from "./program-module.model";

class passwordPolicyModel extends Model { }

passwordPolicyModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    must_contain: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    cannot_contain: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    not_allowed_words: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    min_length: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    max_log_attempt: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    expire_in: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    retained: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    created_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    modified_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    mfa_data: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
}, {
    sequelize,
    modelName: 'password_policy',
    timestamps: false,
});

sequelize.sync();

passwordPolicyModel.belongsTo(ProgramModule, { foreignKey: 'program_id', as: 'programs' });

export default passwordPolicyModel;