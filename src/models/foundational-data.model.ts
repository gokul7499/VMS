import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import FoundationalDataTypes from './foundational-datatypes.model';
import { Programs } from './programsModel';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import Tenant from './tenantModel';

class FoundationalData extends Model {
    id: any;
    foundational_data_type_id: any;
    name: any;
    manager_id: any;
}

FoundationalData.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    created_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
        allowNull: false,
    },
    modified_on: {
        type: DataTypes.DOUBLE,
        defaultValue: Date.now(),
        allowNull:false,
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    modified_by: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    foundational_data_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'master_data_type',
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
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    creation_source: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    manager_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'tenant',
            key: 'id',
        },
    },
    depended_fields: {
        type: DataTypes.JSON,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'master_data',
    hooks: {
        beforeValidate: (instance) => {
            convertEmptyStringsToNull(instance);
        },
        beforeSave: (instance) => {
            beforeSave(instance);
        },
    },
});

FoundationalData.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
FoundationalData.belongsTo(FoundationalDataTypes, { foreignKey: 'foundational_data_type_id', as: 'master_data_type' });
FoundationalData.belongsTo(Tenant, { foreignKey: 'manager_id', as: 'owner' });
sequelize.sync();

export default FoundationalData;
