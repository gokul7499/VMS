import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/instance';


class DisebleMtp extends Model {

}

DisebleMtp.init(
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
    },
    {
        sequelize,
        tableName: "diseble_mtp",
        timestamps: false,
       
    }

);

sequelize.sync();
export default DisebleMtp;
