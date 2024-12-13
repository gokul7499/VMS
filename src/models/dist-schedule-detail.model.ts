import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import VendorDistributionSchedule from './vendorDistributionScheduleModel';

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
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    modified_on: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
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
}, {
    sequelize,
    modelName: 'dist_schedule_detail',
    timestamps: false,
});
DistScheduleDetail.belongsTo(VendorDistributionSchedule, { foreignKey: 'vendor_distrubution_id', as: 'vendor_distrubution' });
export default DistScheduleDetail;