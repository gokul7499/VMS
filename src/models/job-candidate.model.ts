import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programsModel";
import jobModel from "./job.model";

class JobCandidateModel extends Model {
  vendor: any;
}

JobCandidateModel.init(
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
        model: 'programs',
        key: 'id'
      }
    },
    job_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'jobs',
        key: 'id'
      }
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    middle_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vendor: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: "job_candidate",
    timestamps: true,
  }
);

sequelize.sync()
JobCandidateModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobCandidateModel.belongsTo(jobModel, { foreignKey: 'job_id', as: 'jobs' });
export default JobCandidateModel;