import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { beforeSave } from "../hooks/timeFormatHook";
import WorkLocationCurrency from "./WorkLocationCurrencyModel";

class WorkLocationModel extends Model {
  id: any;
  name: any;
  currencies: any;
  countries: any;
  states: any;
  state_name: any;
  currency_id: any;
}

WorkLocationModel.init(
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
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address_line_1: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address_line_2: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    street_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    county_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zipcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country_id: {
      type: DataTypes.STRING,
    },
    real_estate_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tax_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    creation_source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    created_on: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    timezone_id: {
      type: DataTypes.STRING,
    },
    custom_fields: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    program_id: {
      type: DataTypes.UUID,
      references: {
        model: "programs",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "work_locations",
    timestamps: false,
    hooks: {
      beforeSave,
    },
  }
);

sequelize.sync();

WorkLocationModel.belongsTo(Programs, { foreignKey: "program_id", as: "program" });
WorkLocationModel.hasMany(WorkLocationCurrency, { foreignKey: 'work_location_id', as: 'currencies' });

export default WorkLocationModel;