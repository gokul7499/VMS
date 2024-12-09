import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from "../models/programsModel"
import countriesModel from "../models/countriesModel";
import { programVendor } from "./programVendorModel";
class Candidate extends Model {
    id: any;
}

Candidate.init(
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
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "tenant",
                key: "id",
            },
        },
        resume_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        worker_type_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        candidate_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        websites: {
            type: DataTypes.JSON,
            allowNull: true
        },
        avatar: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        name_prefix: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        candidate_source: {
            type: DataTypes.STRING,
            allowNull: true,
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
        name_suffix: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        user_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        birth_date: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        country_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "countries",
                key: "id",
            },
        },
        vendor_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "program_vendors",
                key: "id",
            },
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        job_level: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        npi: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        job_category_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_advanced_profile: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        contacts: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        addresses: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        qualifications: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        custom_fields: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        preferences: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        created_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,
        }
    },
    {
        sequelize: sequelize,
        tableName: "candidates",
        timestamps: true,
        hooks: {
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        }
    }
);

Candidate.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
Candidate.belongsTo(countriesModel, { foreignKey: 'country_id', as: 'country' });
Candidate.belongsTo(programVendor, { foreignKey: 'vendor_id', as: 'vendor' });
export default Candidate;
