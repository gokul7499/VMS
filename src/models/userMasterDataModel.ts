import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';

class UserMasterDataModel extends Model {
    user_id: string | undefined;
    foundation_data_type_id: any;
    foundation_data_ids: any;
    default_master_data: any;
    is_associated: any;
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
        allowNull: true
    },
    foundation_data_ids: {
        type: DataTypes.JSON,
        allowNull: true
    },
    default_master_data: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_associated: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    }
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

export default UserMasterDataModel;
