import dotenv from 'dotenv';
import { getSecretsManager } from './secrets-manager';

dotenv.config();

let config: any;

export const initializeDatabase = async () => {
  config = await getSecretsManager();
};

export const databaseConfig = {
  config: {
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database,
    port: config.port
  }
};