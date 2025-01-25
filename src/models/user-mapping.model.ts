import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { Programs } from './programs.model';
import User from './user.model';
import Tenant from './tenant.model';

class UserMapping extends Model {
    user_id: any;
    user: any;
    time_zone_id: any;
    status: any;
}

UserMapping.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'tenant',
            key: 'id',
        },
    },
role_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'user',
            key: 'id',
        },
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
    vendor_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    is_activated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: Date.now()
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        defaultValue: Date.now()
    },
    created_by: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: true
    },
    modified_by: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: true
    },
    status:{
    type:DataTypes.STRING
    },
    ref_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'user_mappings',
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
UserMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'Programs' });
UserMapping.belongsTo(User, { foreignKey: "user_id", as: 'user' });
UserMapping.belongsTo(Tenant, { foreignKey: "tenant_id", as: 'tenant' });

export default UserMapping;
