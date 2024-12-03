import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programsModel";
import { Module } from "./moduleModel";
import Event from "./eventModel";

class RuleFieldInputConfig extends Model { }

RuleFieldInputConfig.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        ruleFieldInputConfig: {
            type: DataTypes.JSON,
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
        module_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "module",
                key: "id",
            },
        },
        event_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "event",
                key: "id",
            },
        },
    },
    {
        sequelize,
        tableName: "rule_field_input_config",
    }
);

sequelize.sync();
RuleFieldInputConfig.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});
RuleFieldInputConfig.belongsTo(Module, {
    foreignKey: "module_id",
    as: "module",
});
RuleFieldInputConfig.belongsTo(Event, {
    foreignKey: "event_id",
    as: "event",
});

export default RuleFieldInputConfig;
