import Redis from "ioredis";
import dotenv from "dotenv";
import { databaseConfig } from './db';

dotenv.config();

const { redis_host, redis_port } = databaseConfig.config;

const redis = new Redis({
  host: redis_host,
  port: redis_port
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis successfully!");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

export default redis;