import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  config: {
    host: "localhost",
    user: "root",
    password: "root",
    database: "auth",
    port : 3306   
  
  }
};
