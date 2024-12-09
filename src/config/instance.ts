import { Sequelize } from 'sequelize';
import { databaseConfig } from '../config/db';

const sequelize = new Sequelize(
  databaseConfig.config.database ?? '',
  databaseConfig.config.user ?? '',
  databaseConfig.config.password,
  {
    host: databaseConfig.config.host,
    dialect: 'mysql',
    
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

export { sequelize, checkDatabaseConnection };
