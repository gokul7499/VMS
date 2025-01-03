import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { Programs } from "./programs.model";
import IndustriesModel from './labour-category.model';

class RateCard extends Model {
    id: any;
    decision_table: never[] | undefined;
    labor_category_id: any;
}

RateCard.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    labor_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: IndustriesModel,
        key: "id",
      },
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Programs,
        key: "id",
      },
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
      type: DataTypes.UUID,
      allowNull: true,
    },
    modified_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    created_on: {
      type: DataTypes.DOUBLE,
      defaultValue: DataTypes.NOW,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "rate_card",
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
RateCard.belongsTo(Programs, { foreignKey: "program_id", as: "program" });
RateCard.belongsTo(IndustriesModel, { foreignKey: "labor_category_id", as: "LaborCategory" });

export default RateCard;
