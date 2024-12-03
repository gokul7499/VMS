import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import hierarchies from "./hierarchiesModel";
import { Programs } from "./programsModel";
import { TimesheetRuleData } from "../interfaces/timesheetruleconfignterface";
import TimeSheetConfigModel from "./timeSheetConfigModel";

interface TimeSheetConfigRuleModel
    extends Model<TimesheetRuleData> {
    setHierarchies(hierarchyIds: string[]): Promise<void>;
    setTimesheetConfig(timesheet_config_id: string[]): Promise<void>;

}

class TimeSheetConfigRuleModel extends Model<TimesheetRuleData> {
    id: any;
}

TimeSheetConfigRuleModel.init(
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
                model: "programs",
                key: "id",
            },
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        hierarchy_ids: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        timesheet_config_id: {
            type: DataTypes.UUID,
            allowNull: false,

        },
        rules_config: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        status: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        modified_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        created_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,

        },
        modified_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,

        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
        ref_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "timesheet_config_rules",
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

TimeSheetConfigRuleModel.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

TimeSheetConfigRuleModel.belongsToMany(hierarchies, {
    through: "timesheet_rule_hierarchies",
    as: "hierarchies",
    foreignKey: "timesheet_rule_id",
    otherKey: "hierarchy_id",
    timestamps: false,
});

TimeSheetConfigRuleModel.belongsToMany(TimeSheetConfigModel, {
    through: "timesheet_rule_timesheet_config",
    as: "timesheetConfig",
    foreignKey: "timesheet_rule_id",
    otherKey: "timesheet_config_id",
    timestamps: false,
});



export default TimeSheetConfigRuleModel;
