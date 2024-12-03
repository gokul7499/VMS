import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { timeSheetConfigInterface } from "../interfaces/timeSheetConfigInterface";
import hierarchies from "./hierarchiesModel";
import WorkLocationModel from "./workLocationModel";
import { Programs } from "./programsModel";
import FoundationalDataTypes from "./foundationalDatatypesModel";
import CountryModel from "./countriesModel";
import stateModel from "./stateModel";
import countyModel from "./countyModel";
import cityModel from "./cityModel";

interface TimeSheetConfigModel extends Model<timeSheetConfigInterface> {
  setHierarchies(hierarchyIds: string[]): Promise<void>;
  setFoundational_datatypes(foundationalDataIds: string[]): Promise<void>;
  setWorkLocations(workLocationIds: string[]): Promise<void>;
  setCountries(countryIds: string[]): Promise<void>;
  setState(stateIds: string[]): Promise<void>;
  setCounty(countyIds: string[]): Promise<void>;
  setCity(cityIds: string[]): Promise<void>;
}

class TimeSheetConfigModel extends Model<timeSheetConfigInterface> {
  id: any;
  workLocations: any;
  hierarchies: any;
}

TimeSheetConfigModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "programs",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    display_title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    hierarchy_ids: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    location_type: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    work_location_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    remote_country_ids: {
      type: DataTypes.JSON
    },
    remote_state_ids: {
      type: DataTypes.JSON
    },
    remote_county_ids: {
      type: DataTypes.JSON
    },
    is_all_work_location: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    remote_city_ids: {
      type: DataTypes.JSON
    },
    rules: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    work_period: {
      type: DataTypes.STRING,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    work_start_day: {
      type: DataTypes.JSON,
      allowNull: true
    },
    activity_notes: {
      type: DataTypes.JSON
    },
    is_all_remote_work_location: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    copy_number: {
      type: DataTypes.STRING
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
      allowNull: true,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    info_level_details: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    foundational_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    time_sheet_format: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  },
  {
    sequelize,
    tableName: "timesheet_config",
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

TimeSheetConfigModel.belongsToMany(hierarchies, {
  through: "timesheet_config_hierarchies",
  as: "hierarchies",
  foreignKey: "timesheet_config_id",
  otherKey: "hierarchy_id",
  timestamps: false,
});

TimeSheetConfigModel.belongsToMany(FoundationalDataTypes, {
  through: "timesheet_config_foundational_datatypes",
  as: "foundational_datatypes",
  foreignKey: "timesheet_config_id",
  otherKey: "foundational_datatypes_id",
  timestamps: false,
});

TimeSheetConfigModel.belongsToMany(WorkLocationModel, {
  through: "timesheet_config_work_locations",
  as: "workLocations",
  foreignKey: "timesheet_config_id",
  otherKey: "work_location_id",
  timestamps: false,
});
TimeSheetConfigModel.belongsToMany(CountryModel, {
  through: "timesheet_config_countries",
  as: "countries",
  foreignKey: "timesheet_config_id",
  otherKey: "country_id",
  timestamps: false,
});
TimeSheetConfigModel.belongsToMany(stateModel, {
  through: "timesheet_config_state",
  as: "state",
  foreignKey: "timesheet_config_id",
  otherKey: "state_id",
  timestamps: false,
});
TimeSheetConfigModel.belongsToMany(countyModel, {
  through: "timesheet_config_county",
  as: "county",
  foreignKey: "timesheet_config_id",
  otherKey: "county_id",
  timestamps: false,
});
TimeSheetConfigModel.belongsToMany(cityModel, {
  through: "timesheet_config_city",
  as: "city",
  foreignKey: "timesheet_config_id",
  otherKey: "city_id",
  timestamps: false,
});

TimeSheetConfigModel.belongsTo(Programs, {
  foreignKey: "program_id",
  as: "programs",
});

export default TimeSheetConfigModel;