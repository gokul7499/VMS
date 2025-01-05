import dotenv from 'dotenv';
// import { getSecretsManager } from './secrets-manager';
 
dotenv.config();
 
let config: any;
 
export const initializeDatabase = async () => {
  // config = await getSecretsManager();
};
 
export const databaseConfig = {
  get config() {
    if (!config) {
      throw new Error('Database configuration has not been initialized.');
    }
    return {
      host: "localhost",
      user:"root",
      password:"priyanka123",
      database:"qa_vms_configurator",
      port: 3306
    };
  }
};