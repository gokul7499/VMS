import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";

class WorkLocationCurrency extends Model {
  id!: string;
  work_location_id!: string;
  currency_id!: string;
  is_default!: boolean;
}

WorkLocationCurrency.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    work_location_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'work_locations',
        key: 'id',
      },
    },
    currency_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING
    },
    code: {
      type: DataTypes.STRING
    },
    created_on: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    updated_on: {
      type: DataTypes.DOUBLE,
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
    modelName: 'work_locations_currencies',
    timestamps: false,
  }
);

export default WorkLocationCurrency;
