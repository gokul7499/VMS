import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  config: {
    host: "localhost",
    user: "root",
    password: "pass@123",
    database: "qa_vms_configurator",
    port : 3306
  }
};
