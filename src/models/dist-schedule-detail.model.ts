import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import VendorDistributionSchedule from './vendor-distribution-schedule.model';

class DistScheduleDetail extends Model {
    id: any;
    program_id: any;
    duration: any;
    measure_unit: any;
    vendors: never[] | undefined;
}

DistScheduleDetail.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    vendor_distrubution_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "vendor_distribution_schedules",
            key: "id",
        },
    },
    measure_unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    vendors: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
    modelName: 'dist_schedule_detail',
    timestamps: false,
});
DistScheduleDetail.belongsTo(VendorDistributionSchedule, { foreignKey: 'vendor_distrubution_id', as: 'vendor_distrubution' });
export default DistScheduleDetail;