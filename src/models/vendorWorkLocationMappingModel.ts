import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programsModel";

class vendorWorkLocationMapping extends Model { }

vendorWorkLocationMapping.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        program_vendor_id: {
            type: DataTypes.UUID,
            references: {
                model: "program_vendors",
                key: "id",
            },
            allowNull: true,
        },
        labour_category_id: {
            type: DataTypes.UUID,
            references: {
                model: "industries",
                key: "id",
            },
            allowNull: true,
        },
        program_id: {
            type: DataTypes.UUID,
            references: {
                model: "programs",
                key: "id",
            },
            allowNull: true,
        },
        vendor_work_location_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
        created_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: Date.now(),
        },
        modified_on: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            defaultValue: Date.now(),
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
    },
    {
        sequelize,
        timestamps: false,
        modelName: "vendor_work_location_mappings"
    }
);

vendorWorkLocationMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' })

export default vendorWorkLocationMapping;