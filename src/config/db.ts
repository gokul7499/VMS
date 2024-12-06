import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  config: {
    host: "nonprod-v4-mysql-master-nv.c7su4okqw673.us-east-1.rds.amazonaws.com",
    user: "configuratorqauser",
    password: "Tg6gL225gF6hvF9V",
    database: "qa_vms_configurator",
    port : 3306
  },
  sourcing: {
    host: "nonprod-v4l-mysql-replica-master-1-nv.c7su4okqw673.us-east-1.rds.amazonaws.com",
    user: "sourcingqauser",
    password: "x3GgrnfvNdsKCnP6",
    database: "qa_vms_sourcing",
    port : 3306
  }
};
