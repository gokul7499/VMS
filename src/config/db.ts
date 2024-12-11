import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  config: {
    host: "nonprod-v4-mysql-master-nv.c7su4okqw673.us-east-1.rds.amazonaws.com",
    user: "configuratorqauser",
    password: "Tg6gL225gF6hvF9V",
    database: "qa_vms_configurator",
    port : 3306   
  
    // host: "13.203.44.227",
    // user: "svms_v4_dev",
    // password: "fe2w#1Dq1r@i5w4",
    // database: "test",
    // port : 3000   
  }
};
