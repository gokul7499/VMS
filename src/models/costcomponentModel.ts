import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from './programsModel';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';

class CostcomponentModel extends Model {
  id: any;
}

CostcomponentModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    modified_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_on: {
      type: DataTypes.DOUBLE,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
    },
    ref_id: {
      type: DataTypes.UUID,
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
    modelName: 'costcomponents',
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

sequelize.sync();
CostcomponentModel.belongsTo(Programs, { foreignKey: 'program_id' });
export default CostcomponentModel;
