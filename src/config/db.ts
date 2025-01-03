import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  get config() {
    if (!config) {
      throw new Error('Database configuration has not been initialized.');
    }
    return {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port
    };
  }
};
