import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance'; // Import the Sequelize instance
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';

class TimeZone extends Model {
  id: any;
  name: any;
}

// Define the TimeZone model
TimeZone.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  code: {
    type: DataTypes.CHAR(255),
    allowNull: false,
  },
  name: {
    type: DataTypes.CHAR(255),
    allowNull: false,
  },
  offset: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  utc_offset: {
    type: DataTypes.CHAR(255),
    allowNull: false,
    defaultValue: '', // Add a default value for utc_offset
  },
  region: {
    type: DataTypes.CHAR(255),
    allowNull: false,
  },
  num: {
    type: DataTypes.CHAR(255),
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'time_zones', // Custom table name
  timestamps: false, // Disable createdAt and updatedAt fields
  hooks: {
    beforeValidate: (instance) => {
      convertEmptyStringsToNull(instance);
    },
    beforeSave: (instance) => {
      beforeSave(instance);
    },
  },
});

// Synchronize the model with the database
sequelize.sync();
export default TimeZone;