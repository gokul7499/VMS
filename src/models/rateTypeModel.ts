import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
class rateType extends Model {
  shift_category: string | undefined;
  id!: string;
  type!: string
}

rateType.init(
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
    description: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bill_rate: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    pay_rate: {
      type: DataTypes.JSON,
      allowNull: true,
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
      defaultValue: false,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
      defaultValue: false,
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
    ref_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ot_exemption: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: true,
    },
    is_shift_rate: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    shift_rate: {
      type: DataTypes.JSON,
      allowNull: true
    },
    shift_category: {
      type: DataTypes.STRING
    },
    edit_rate_factors: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    hide_rate_factors: {
      type: DataTypes.BOOLEAN,
    },
    is_billable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ordering: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    ref_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    program_id: {
      type: DataTypes.UUID,
      references: {
        model: "programs",
        key: "id",
      },
    },
    expense_rate: {
      type: DataTypes.JSON,
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

//rateType.belongsTo(Programs, { foreignKey: "program_id", as: "program" });

export { rateType };
