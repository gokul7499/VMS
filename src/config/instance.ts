import { Sequelize } from 'sequelize';
import { databaseConfig } from '../config/db';
import { Programs } from '../models/programsModel';
import Candidate from '../models/candidateModel';
import Tenant from '../models/tenantModel';
import countriesModel from '../models/countriesModel';
import { programVendor } from '../models/programVendorModel';

const sequelize = new Sequelize(
  databaseConfig.config.database ?? '',
  databaseConfig.config.user ?? '',
  databaseConfig.config.password,
  {
    host: databaseConfig.config.host,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 60000 // Increase timeout to 60 seconds
    }
  }
);

const sequelize2 = new Sequelize(
  databaseConfig.sourcing.database ?? '',
  databaseConfig.sourcing.user ?? '',
  databaseConfig.sourcing.password,
  {
    host: databaseConfig.sourcing.host,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 60000 // Increase timeout to 60 seconds
    }
  }
);

const checkDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    return { connected: true, message: 'Database connected successfully' };
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return { connected: false, message: 'Database connection failed', error };
  }
};

const syncDatabase = async () => {
  try {
    await Programs.sync();
    await Tenant.sync();
    await countriesModel.sync();
    await programVendor.sync();
    await Candidate.sync();
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing models:', error);
  }
};

export { sequelize, sequelize2, checkDatabaseConnection, syncDatabase };