import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";

class CostComponentMapping extends Model {
  cost_component_id: any;
}

CostComponentMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    cost_component_id: {
      type: DataTypes.UUID,
      allowNull: false
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
      defaultValue: Date.now(),
    },
    modified_on: {
      type: DataTypes.DOUBLE,
      defaultValue: Date.now(),
    },
  },
  {
    sequelize,
    tableName: "cost_component_mapping",
    timestamps: false,
  }
);

sequelize.sync();

export default CostComponentMapping;
