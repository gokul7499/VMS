import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import jobModel from './job.model';
import Candidate from './candidate.model';

class SubmissionCandidateModel extends Model {
    id: any;
    job_id: any;
    candidate_id: any;
    addresses: any;
    is_remote_worker: any;
    job: any;
    jobModel: any;
    jobs: any;
    program_id: any;
    vendor_id: any;
}

SubmissionCandidateModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'programs',
                key: 'id',
            },
        },
        job_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'jobs',
                key: 'id',
            },
        },
        resume_url: {
            type: DataTypes.STRING,
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
        is_candidate_work_before: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        is_remote_worker: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        candidate_source: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        addresses: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        employment_status: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "Pending Shortlist"
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        documents: {
            type: DataTypes.JSON,
            allowNull: true
        },
        financial_detail: {
            type: DataTypes.JSON,
            allowNull: true
        },
        created_on: {
            type: DataTypes.DOUBLE,
            defaultValue: Date.now(),
            allowNull: false,
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            defaultValue: Date.now(),
            allowNull: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
        },
        candidate_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'candidates',
                key: 'id',
            },
        },
        unique_id: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'job_submission_candidate',
        timestamps: false,
    }
);

SubmissionCandidateModel.belongsTo(Programs, { foreignKey: 'program_id' });
SubmissionCandidateModel.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });
SubmissionCandidateModel.belongsTo(jobModel, { foreignKey: 'job_id', as: 'jobs' });

export default SubmissionCandidateModel;
