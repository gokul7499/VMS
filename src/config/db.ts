import dotenv from 'dotenv';
import { getSecretsManager } from './secrets-manager';

dotenv.config();

let config: any;

export const initializeDatabase = async () => {
  config = await getSecretsManager();
};

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
      port: config.port,
      redis_host: config.redis_host,
      redis_port: config.redis_port,
      redis_auth: config.redis_auth,
      redis_replica_host: config.redis_replica_host,
      reconnect: {
        max: 10,
        delay: 1000,
      },
    };
  }
};