import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

import { Programs } from './programsModel';
class CustomFieldLocation extends Model {
    work_location_id: any;
    custom_field_id: any;
    id: any;
}
CustomFieldLocation.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    custom_field_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    work_location_id: {
        type: DataTypes.UUID,
        allowNull: false
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
        modelName: 'custom_fields_location',
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    });
CustomFieldLocation.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });

sequelize.sync();
export default CustomFieldLocation;
