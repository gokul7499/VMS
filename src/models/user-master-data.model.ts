import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import FoundationalData from './foundational-data.model';
import FoundationalDataTypes from './foundational-datatypes.model';
import hierarchies from './hierarchies.model';

class UserMasterDataModel extends Model {
    user_id: string | undefined;
    foundation_data_type_id: any;
    foundation_data_ids: any;
    default_master_data: any;
    is_associated: any;
    default_master_datas: any
    foundation_data_type: any;
    hierarchy_id: any;
    hierarchies: any;
}

UserMasterDataModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    foundation_data_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'master_data_type',
            key: 'id'
        }
    },
    foundation_data_ids: {
        type: DataTypes.JSON,
        allowNull: true
    },
    default_master_data: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'master_data',
            key: 'id'
        }
    },
    is_associated: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    hierarchy_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'hierarchies',
            key: 'id'
        }
    },
}, {
    sequelize,
    tableName: 'user_master_data',
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
UserMasterDataModel.belongsTo(FoundationalData, { foreignKey: 'default_master_data', as: 'default_master_datas' });
UserMasterDataModel.belongsTo(FoundationalDataTypes, { foreignKey: 'foundation_data_type_id', as: 'foundation_data_type' });
UserMasterDataModel.belongsTo(hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchies' });

export default UserMasterDataModel;
