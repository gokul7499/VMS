import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  config: {
    host: "nonprod-v4-mysql-master-nv.c7su4okqw673.us-east-1.rds.amazonaws.com",
    user: "configuratorqauser",
    password: "Tg6gL225gF6hvF9V",
    database: "qa_vms_configurator",
    port : 3306 ,
      
 
  }
};
