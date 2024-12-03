import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import { Programs } from "./programsModel";
import Workflow from "./workflowModel";


class WorkflowStatusHistory extends Model { }

WorkflowStatusHistory.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.UUID,
            references: {
                model: "programs",
                key: "id",
            },
        },
        workflow_id: {
            type: DataTypes.UUID,
            references: {
                model: "workflow",
                key: "id",
            },
        },
        resone:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        notes: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        placement_order: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true,
        },
      
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        created_on: {
            type: DataTypes.DOUBLE,
        },
        modified_on: {
            type: DataTypes.DOUBLE,
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        modified_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        }
    },
    {
        sequelize,
        tableName: "workflow_status_history",
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

sequelize.sync();
WorkflowStatusHistory.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

WorkflowStatusHistory.belongsTo(Workflow, {
    foreignKey: "workflow_id",
    as: "workflow",
});
export default WorkflowStatusHistory;
