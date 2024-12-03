import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { Programs } from './programsModel';
import RuleBuilder from './ruleBuilderModel';
import hierarchies from './hierarchiesModel';
import Event from "./eventModel";
import { Action, Condition, RuleStatus } from '../interfaces/ruleBuilderInterface';
class RuleBuilderDecisionTable extends Model {
  public conditions?: Condition[];
  public actions?: Action[];
  public id?: string;
  public status?: RuleStatus;
  public hierarchy_ids?: string[];
  public module_id?: string;
  created_on: any;
  rules_json: any;
}

RuleBuilderDecisionTable.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  program_id: {
    type: DataTypes.UUID,
    references: {
      model: Programs,
      key: 'id',
    },
    allowNull: true
  },
  event_slug: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rules_json: {
    type: DataTypes.JSON,
    allowNull: true
  },
  rule_name: {
    type: DataTypes.STRING
  },
  rule_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: RuleBuilder,
      key: 'id',
    },
  },
  rule_event_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'event',
      key: "id",
    },
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  created_on: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  modified_on: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  hierarchy_ids: {
    type: DataTypes.JSON
  },
  status: {
    type: DataTypes.ENUM,
    values: ["Active", "Inactive", "Expired"]
  },
  module_id: {
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
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  }
}, {
  sequelize,
  tableName: 'rule_builder_decision_table',
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

RuleBuilderDecisionTable.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
RuleBuilderDecisionTable.belongsTo(RuleBuilder, { foreignKey: 'rule_id', as: 'rule' });
RuleBuilderDecisionTable.belongsTo(hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchy' });
RuleBuilderDecisionTable.belongsTo(Event, {
  foreignKey: "rule_event_id",
  as: "event",
});
export default RuleBuilderDecisionTable;