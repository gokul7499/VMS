import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { Programs } from './programsModel';
import RuleBuilder from './ruleBuilderModel';
import hierarchies from './hierarchiesModel';

class RuleBuilderHierarchyMapping extends Model { }

RuleBuilderHierarchyMapping.init({
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
  rule_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: RuleBuilder,
      key: 'id',
    },
  },
  hierarchy_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: hierarchies,
      key: 'id',
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
  tableName: 'rule-builder-hierarchy-mapping',
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

RuleBuilderHierarchyMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
RuleBuilderHierarchyMapping.belongsTo(RuleBuilder, { foreignKey: 'rule_id', as: 'rule' });
RuleBuilderHierarchyMapping.belongsTo(hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchy' });
export default RuleBuilderHierarchyMapping;