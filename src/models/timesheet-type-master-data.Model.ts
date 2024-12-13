import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import FoundationalDataTypes from './foundationalDatatypesModel';

class TimesheetMasterData extends Model {
    id!: string;
    timesheet_type_config_id?: string;
    value!: object;
    is_allow!: boolean;
    timesheet_master_data: any;
    master_data: any;
}
TimesheetMasterData.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        timesheet_type_config_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        value: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: FoundationalDataTypes,
                key: 'id'
            }
        },
        is_allow: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'timesheet_type_master_data',
        timestamps: false,
    }
);

TimesheetMasterData.belongsTo(FoundationalDataTypes, { foreignKey: 'value', as: 'master_data' });
export default TimesheetMasterData;