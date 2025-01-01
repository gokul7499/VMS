import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
class RateType extends Model {
  id!: string;
  type!: string
  is_base_rate: any;
  name: any;
  is_shift_rate: any;
  rate_type_category: any;
  shift_type: any;
}
RateType.init(
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
      unique: true
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    created_on: {
      type: DataTypes.DOUBLE,
      defaultValue: DataTypes.NOW,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    modified_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    abbreviation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shift_type: {
      type: DataTypes.UUID,
      defaultValue: true,
    },
    is_shift_rate: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    rate: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_base_rate: {
      type: DataTypes.BOOLEAN,
      defaultValue:false,
      allowNull: true,
    },
    program_id: {
      type: DataTypes.UUID,
      references: {
        model: "programs",
        key: "id",
      },
    },
    rate_type_category: {
      type: DataTypes.UUID,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "rate_type",
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
export default RateType;
