import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programsModel";
import jobTemplateModel from "./job-template.model";
import WorkLocationModel from "./workLocationModel";
import qualificationTypeModel from "./qualificationTypeModel";
import userModel from "./userModel";
class jobModel extends Model {
    id: any;
    work_location_id: any;
    hierarchy_ids: any;
    job_template_id: any;
    program_id: any;
    job_manager_id: any;
    workLocation: any;
    jobTemplate: any;
    hierarchies: any;
}

jobModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: true,
            primaryKey: true,
        },
        job_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'programs',
                key: 'id',
            },
        },
        job_manager_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'user',
                key: 'id',
            },
        },
        job_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        job_template_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'job_templates',
                key: 'id',
            },
        },
        hierarchy_ids: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        work_location_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'work_locations',
                key: 'id',
            },
        },
        labor_category_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        additional_attachments: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        no_positions: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        expense_allowed: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        currency: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        unit_of_measure: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        min_bill_rate: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        max_bill_rate: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        allow_per_identified_s: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        job_leval: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        pri_identified_candidates: {
            type: DataTypes.JSON,
            allowNull: true
        },
        credentials: {
            type: DataTypes.JSON,
            allowNull: true
        },
        working_days: {
            type: DataTypes.JSON,
            allowNull: true
        },
        shifts_per_week: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        estimated_hours_per_shift: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        shift: {
            type: DataTypes.STRING,
            allowNull: true
        },
        adjustment_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        adjustment_value: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        budgets: {
            type: DataTypes.JSON,
            allowNull: true
        },
        financial_calculation: {
            type: DataTypes.JSON,
            allowNull: true
        },
        rate: {
            type: DataTypes.JSON,
            allowNull: true
        },
        qualifications: {
            type: DataTypes.JSON,
            allowNull: true
        },
        foundational_data: {
            type: DataTypes.JSON,
            allowNull: true
        },
        custom_fields: {
            type: DataTypes.JSON,
            allowNull: true
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        rate_configuration: {
            type: DataTypes.JSON
        },
        created_by: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: true,
        },
        modified_by: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: true,
        },
        created_on: {
            type: DataTypes.DOUBLE,
            defaultValue: Date.now(),
            allowNull: true,

        },
        modified_on: {
            type: DataTypes.DOUBLE,
            defaultValue: Date.now(),
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "jobs",
        timestamps: true,
    }
);

sequelize.sync()
jobModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
jobModel.belongsTo(jobTemplateModel, { foreignKey: 'job_template_id', as: 'job_templates' });
jobModel.belongsTo(WorkLocationModel, { foreignKey: 'work_location_id', as: 'work_location' });
jobModel.belongsTo(userModel, {
    foreignKey: 'job_manager_id',
    as: 'jobManager'
});


export default jobModel;
