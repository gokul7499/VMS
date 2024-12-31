import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import ReasonCodeActionModel from "./reason-code-action.model";
import { Programs } from "./programs.model";


class ReasonCodeModel extends Model {
    id?: any;
}

ReasonCodeModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        created_on: {
            type: DataTypes.DOUBLE,
        },
        modified_on: {
            type: DataTypes.DOUBLE,
        },
        created_by: {
            type: DataTypes.JSON,
        },
        modified_by: {
            type: DataTypes.JSON,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        reason_code_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: ReasonCodeActionModel,
                key: 'id'
            }
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id',
            },
        },
    },
    {
        sequelize,
        tableName: "reason_codes",
        modelName: "reason_codes",
        timestamps: false,


    }
);

sequelize.sync();
ReasonCodeModel.belongsTo(Programs, { foreignKey: 'program_id' });
ReasonCodeModel.belongsTo(ReasonCodeActionModel, { foreignKey: "reason_code_id", as: "reason_codes" })
export default ReasonCodeModel;
