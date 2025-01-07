
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";

class JobCategoryModel extends Model {
    id: any;
}

JobCategoryModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        category: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        },
        modified_by: {
            type: DataTypes.UUID,
        },
    },
    {
        sequelize,
        tableName: "job_category",
        timestamps: false,
    }
);

sequelize.sync();

export default JobCategoryModel;