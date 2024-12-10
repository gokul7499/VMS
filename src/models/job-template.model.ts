import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import jobCategoryModel from "./job-category.model";
import { Programs } from "./programsModel";
import IndustriesModel from "./industriesModel";

class JobTemplateModel extends Model {
    id: any;
    job_id: any;
    job_category: any;
    program_id: any;
    program_industry: any;
    template_name: any;
    job_submitted_count: number | undefined ;
    custom_field_id: any;
}

JobTemplateModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        template_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        job_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        job_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        category: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'job_category',
                key: 'id'
            }
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id'
            }
        },
        ref_title: {
            type: DataTypes.UUID,
            allowNull: true
        },
        template_code: {
            type: DataTypes.STRING,
            allowNull: false
        },
        level: {
            type: DataTypes.STRING,
            allowNull: true
        },
        program_industry: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'labour_category',
                key: 'id'
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        is_submission_exceed_max_bill_rate: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        allow_express_offer: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        is_qualification_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        is_description_editable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        },
        user_roles: {
            type: DataTypes.JSON,
            allowNull: true
        },
        is_onboarding_checklist: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        available_start_date_limit: {
            type: DataTypes.JSON,
            allowNull: false
        },
        submission_limit_vendor: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        is_automatic_distribution: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_tiered_distribute_schedule: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_manual_distribution_job_submit: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_automatic_distribute_submit: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_automatic_distribute_final_approval: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        immediate_distribution: {
            type: DataTypes.STRING,
            allowNull: true
        },
        submit_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_template: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_expense_allowed_editable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        is_expense_allowed: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        jd_parsing_file: {
            type: DataTypes.JSON,
            allowNull: true
        },
        resume_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        checklist: {
            type: DataTypes.UUID,
            allowNull: true
        },
        allow_user_description: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        is_background_check: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        job_submitted_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        created_by: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: true,
        },
        modified_by: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: true
        },
        created_on: {
            type: DataTypes.DOUBLE,
            defaultValue: Date.now(),
            allowNull: true
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            defaultValue: Date.now(),
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: "job_templates",
        timestamps: false,
    }
);

sequelize.sync();

JobTemplateModel.belongsTo(jobCategoryModel, { foreignKey: "category", as: "job_category" });
JobTemplateModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobTemplateModel.belongsTo(IndustriesModel, { foreignKey: 'program_industry', as: 'labour_category' });

export default JobTemplateModel;
