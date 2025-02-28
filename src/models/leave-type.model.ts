
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/instance";


class LeaveTypeModel extends Model { }

LeaveTypeModel.init({


    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },

    display_name: {

        type: DataTypes.STRING,
        allowNull: true
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
        allowNull: false
    },
    created_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
        allowNull: false
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true  
    },

    modified_by: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'leave_types',
    timestamps: false,
});


export default LeaveTypeModel ; 
