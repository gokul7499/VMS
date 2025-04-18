import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import MtpRepository from "../repositories/mtp.repository";
const mtpRepositories = new MtpRepository();

class MtpModel extends Model {
    mtp_id: any;
    program_id: any;

}

MtpModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        program_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        mtp_id:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        talent_name:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        linked_profiles:{
            type: DataTypes.JSON,
            allowNull: false,
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "mtp",
        timestamps: false,
        hooks: {
            beforeValidate: async (instance) => {
                convertEmptyStringsToNull(instance);
                if (!instance.mtp_id && instance.program_id) {
                    const programData = await mtpRepositories.programQuery(
                        instance.program_id
                    );
                    if (programData.length > 0 && programData[0].unique_id) {
                        const programPrefix = programData[0].unique_id
                            .substring(0, 3)
                            .toUpperCase();
                        const count = await MtpModel.count({ where: { program_id: instance.program_id } });
                        const sequence = (count + 1).toString().padStart(3, "0");
                        instance.mtp_id = `${programPrefix}-MTP-${sequence}`;
                    }
                }
            },

        },
    }

);

sequelize.sync();
export default MtpModel;
