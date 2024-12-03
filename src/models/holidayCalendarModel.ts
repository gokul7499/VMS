import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import ProgramModule from './programModuleModel';

class holidayCalendar extends Model {
    hierarchy_units_ids: any;
    work_locations_ids: any;
}
holidayCalendar.init({
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
    created_on: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: Date.now(),
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: Date.now(),
    },
    created_by: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
    },
    modified_by: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
}, {
    sequelize,
    modelName: 'holiday_calendar',
});
sequelize.sync();
ProgramModule.belongsTo(ProgramModule, { foreignKey: 'program_id', as: 'programs' });
export default holidayCalendar;
