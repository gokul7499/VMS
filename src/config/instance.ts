import { Sequelize } from 'sequelize';
import { databaseConfig, initializeDatabase } from './db';
 
let sequelize: Sequelize;
 
const initializeSequelize = async () => {
  await initializeDatabase();
  sequelize = new Sequelize(
    "qa_vms_configurator",
    "root",
    "priyanka123",
    {
      host: "localhost",
      port: 3306,
      dialect: 'mysql',
      logging: false
    }
  );
};
 
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
 
export { sequelize, checkDatabaseConnection, initializeSequelize };