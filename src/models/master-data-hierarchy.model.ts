import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import MasterDataModel from './foundational-data.model';
import Hierarchies from './hierarchies.model';

class MasterDataHierarchy extends Model {
  hierarchy: any;

}
MasterDataHierarchy.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    master_data_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: MasterDataModel,
        key: 'id',
      },
    },
    hierarchy_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Hierarchies,
        key: 'id',
      },
    }
  },
  {
    sequelize,
    tableName: 'master_data_hierarchy',
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    },
  }
);

export default MasterDataHierarchy;
