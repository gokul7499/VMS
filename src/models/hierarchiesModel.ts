import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import TimeZone from "./timeZoneModel";
import Currencies from "./currenciesModel";
import { hierarchiesData } from "../interfaces/hierarchiesInterface";
interface TimeSheetConfigModel extends Model<hierarchiesData> {
  setTime_zones(time_zonesIds: string[]): Promise<void>;
}
class Hierarchies extends Model {
  parent_hierarchy_id: any;
  name: any;
  id: any;
  is_enabled: any;
  rate_model!: any;
  program_id!: string;
}
Hierarchies.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    parent_hierarchy_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    preferred_date_format: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_rate_card_enforced: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    rate_model: {
      type: DataTypes.ENUM(
        'Bill Rate (No Markup)',
        'Bill Rate (Markup)',
        'Pay Rate (Markup)'
      ),
      allowNull: true
    },
    created_on: {
      type: DataTypes.DOUBLE,
    },
    modified_on: {
      type: DataTypes.DOUBLE,
    },
    created_by: {
      type: DataTypes.UUID,
    },
    modified_by: {
      type: DataTypes.UUID,
    },
    is_hidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "programs",
        key: "id",
      },
    },
    unit_of_measure: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currency_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "currencies",
        key: "id",
      },
    },
    timezone_id: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_enable_adjustment: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_enable_tax: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_default_timezone: {
      type: DataTypes.UUID,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: "hierarchies",
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
Hierarchies.belongsToMany(TimeZone, {
  through: "hierarchies_time_zone",
  as: "time_zones",
  foreignKey: "hierarchies_id",
  otherKey: "timezone_id",
  timestamps: false,
});

Hierarchies.belongsTo(Currencies, {
  foreignKey: "currency_id",
  as: "currency",
});

Hierarchies.belongsTo(TimeZone, {
  foreignKey: "is_default_timezone",
  as: "default_timezone",
});

export default Hierarchies;
