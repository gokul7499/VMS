import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Module } from './moduleModel';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from './programsModel';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import Event from "./eventModel";
import hierarchies from './hierarchiesModel';
import { Action, Condition, ruleBuilderAttributes, RuleStatus } from '../interfaces/ruleBuilderInterface';

interface ruleBuilderModel extends Model<ruleBuilderAttributes> {
  setHierarchies(hierarchies: string[]): Promise<void>
}

class ruleBuilderModel extends Model<ruleBuilderAttributes> implements ruleBuilderAttributes {
  public id!: string;
  public rule_code?: string;
  public rule_name?: string;
  public module_id?: string;
  public program_id?: string;
  public module_name?: string;
  public module_code?: string;
  public rule_type?: string;
  public effective_start_date?: string;
  public effective_end_date?: string;
  public created_on?: string;
  public created_by?: string;
  public updated_by?: string;
  public is_enabled?: boolean;
  public modified_by?: string;
  public modified_on?: string;
  public rule_event_id?: string;
  public is_deleted?: boolean;
  public hierarchies?: string[];
  public placement_order?: number;
  public decision_table_rule_files?: object;
  public conditions?: Condition[];
  public actions?: Action[];
  public initial_trigger_conditions?: object;
  public rule_inputs?: object;
  public rule_outputs?: object;
  public rules_json?: object;
  public file_submission_status?: string;
  public rule_initial_trigger_conditions?: object;
  public enable_dates?: number;
  public status?: RuleStatus;
  public created_at?: Date
}

ruleBuilderModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  rule_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  rule_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  module_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  module_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'module',
      key: 'id',
    },
  },
  program_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'programs',
      key: 'id',
    },
  },
  rule_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
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
    defaultValue: false,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  effective_start_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  effective_end_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  modified_on: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  created_on: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  hierarchies: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  rule_event_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'event',
      key: "id",
    },
  },
  status: {
    type: DataTypes.ENUM,
    values: ["Active", "Inactive", "Expired"]
  },
  placement_order: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  decision_table_rule_files: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  conditions: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  actions: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  initial_trigger_conditions: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  rule_inputs: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  rule_outputs: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  rules_json: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  file_submission_status: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  rule_initial_trigger_conditions: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  enable_dates: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'rulebuilder',
  timestamps: false,
  hooks: {
    beforeValidate: async (instance) => {
      convertEmptyStringsToNull(instance);
      if (!instance.rule_code && instance.program_id) {
        const program = await Programs.findByPk(instance.program_id);
        if (program && program.name) {
          const programPrefix = program.name.substring(0, 3).toUpperCase();
          const count = await ruleBuilderModel.count();
          const sequence = (count + 1).toString().padStart(5, '0');
          instance.rule_code = `${programPrefix}-RB-${sequence}`;
        }
      }
    },
    beforeSave: (instance) => {
      beforeSave(instance);
    },
  },
});
sequelize.sync();
ruleBuilderModel.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
ruleBuilderModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'Programs' });
ruleBuilderModel.belongsTo(Event, {
  foreignKey: "rule_event_id",
  as: "event",
});
ruleBuilderModel.belongsToMany(hierarchies, {
  through: "rule-builder-hierarchy",
  as: "rule_hierarchies",
  foreignKey: "rule_id",
  otherKey: "hierarchy_id",
});
export default ruleBuilderModel;