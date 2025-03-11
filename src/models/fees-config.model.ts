import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from "./programs.model";
class FeesConfigurationModel extends Model {
  hierarchy_levels!: never[];
  id: any;
  labor_category: never[] | undefined;
  vendors: never[] | undefined;
}
FeesConfigurationModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hierarchy_levels: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  source_model: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  vendors: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  effective_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  funding_model: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  labor_category: {
    type: DataTypes.JSON,
    allowNull: false,
  },

  ref_id: {
    type: DataTypes.UUID,
  },
  categorical_fees: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  funded_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false
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
    defaultValue: DataTypes.NOW,
    allowNull: true
  },
  updated_on: {
    type: DataTypes.DOUBLE,
    defaultValue: DataTypes.NOW,
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

},
  {
    sequelize,
    modelName: 'fees',
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
FeesConfigurationModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
export default FeesConfigurationModel;
