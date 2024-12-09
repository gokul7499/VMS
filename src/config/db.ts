import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  config: {    
    // host: "oneday",
    // user: "root",
    // password: "Ashu@134576",
    // database: "test",
    // port : 3000
    host: "nonprod-v4-mysql-master-nv.c7su4okqw673.us-east-1.rds.amazonaws.com",
    user: "oneday",
    password: "test#123",
    database: "qa_vms_configurator",
    port : 8000 
  },
  // sourcing: {
  //   host: "nonprod-v4l-mysql-replica-master-1-nv.c7su4okqw673.us-east-1.rds.amazonaws.com",
  //   user: "sourcingqauser",
  //   password: "x3GgrnfvNdsKCnP6",
  //   database: "qa_vms_sourcing",
  //   port : 3306
  // }
};
