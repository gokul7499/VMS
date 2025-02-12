import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import qualificationTypeModel from "./qualification-type-model";
import QualificationTypeMaster from "./qualification_type_master.model";

class QualificationValueMaster extends Model {
    code: any;
    qualification_type_id: any;
    name: any;
}

QualificationValueMaster.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "programs",
                key: "id",
            },
        },
        qualification_type_master_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: QualificationTypeMaster,
                key: "id",
            },
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: "qualification_value_master",
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

QualificationValueMaster.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

QualificationValueMaster.belongsTo(QualificationTypeMaster, {
    foreignKey: "qualification_type_master_id",
    as: "qualification_type_master",
});

export default QualificationValueMaster;
