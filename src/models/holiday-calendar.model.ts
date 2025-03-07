import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import ProgramModule from './program-module.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

class HolidayCalendar extends Model {
    hierarchy_units_ids: any;
    work_locations_ids: any;
}
HolidayCalendar.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_all_hierarchies: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    hierarchy_units_ids: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    is_all_work_locations: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    work_locations_ids: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    holidays: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
    created_on: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    updated_on: {
        type: DataTypes.DOUBLE,
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
}, {
    sequelize,
    modelName: 'holiday_calendar',
    tableName: 'holiday_calendar',
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
sequelize.sync();
HolidayCalendar.belongsTo(ProgramModule, { foreignKey: 'program_id', as: 'programs' });
export default HolidayCalendar;
