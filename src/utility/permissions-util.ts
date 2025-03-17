import axios from "axios";
import Redis from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";
import logger from '../plugins/logger-plugin';

dotenv.config();

async function connectToRedis() {
  const { redis_host, redis_port, redis_auth, redis_replica_host } = databaseConfig.config;

  logger.info(`Connecting to Redis at ${redis_host}:${redis_port}`);

  const redis = new Redis({
    host: redis_host,
    port: redis_port,
    password: redis_auth,
    connectTimeout: 60000, // 60s connection timeout
    commandTimeout: 10000, // 10s command timeout
    retryStrategy: (times) => Math.min(times * 50, 2000), // Retry with delay
  });

  const getRedisData = new Redis({
    host: redis_replica_host,
    port: redis_port,
    password: redis_auth,
    connectTimeout: 60000, // 60s connection timeout
    commandTimeout: 10000, // 10s command timeout
    retryStrategy: (times) => Math.min(times * 50, 2000), // Retry with delay
  });

  redis.on("connect", () => {
    logger.info("✅ Connected to Redis successfully!");
  });

  redis.on("error", (err) => {
    logger.error("❌ Redis connection error:", err);
  });

  getRedisData.on("connect", () => {
    logger.info("✅ Connected to Redis replica successfully!");
  });

  getRedisData.on("error", (err) => {
    logger.error("❌ Redis replica connection error:", err);
  });

  try {
    const pingResponse = await redis.ping();
    logger.info(`Redis Ping Response: ${pingResponse}`);
  } catch (error) {
    logger.error("❌ Redis Ping Failed:", error);
  }

  return { redis, getRedisData };
}

async function getPolicies(redisClients: { redis: Redis, getRedisData: Redis }, fastify: any, programId: string, token: string) {
  if (!programId || !token) {
    throw new Error("Missing programId or token");
  }

  const { redis, getRedisData } = redisClients;
  let groupPolicies = null;
  const redisKey = getRedisKeyForAuth(token, programId, null);
  logger.info("Fetching Redis key:", redisKey);

  try {
    // 🔥 Directly attempt to get the data, instead of exists -> get
    const cachedPolicies = await getRedisData.get(redisKey);
    if (cachedPolicies) {
      groupPolicies = JSON.parse(cachedPolicies);
      logger.info("✅ Policies fetched from Redis cache.");
      return groupPolicies;
    }
  } catch (err) {
    logger.error("❌ Error fetching from Redis:", err);
  }

  // 🔥 Fetch only if not in cache
  try {
    const { data } = await axios.get(
      `http://v4-devnlb.simplifysandbox.net:8006/auth/v1/api/policy/user/tenant/${programId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    groupPolicies = data.response;

    // 🔥 Store in cache for 24 hours if it doesn’t change often
    await redis.set(redisKey, JSON.stringify(groupPolicies), "EX", 86400);
    logger.info("✅ Policies cached in Redis.");
  } catch (err) {
    logger.error("❌ Error fetching policies from API:", err);
    throw new Error("Unable to fetch policies");
  }

  return groupPolicies;
}

async function permissionsUtilAuth(fastify: any, opts: any) {
  const redisClients = await connectToRedis();
  return {
    getPolicies: (programId: string, token: string) =>
      getPolicies(redisClients, fastify, programId, token),
  };
}

export default permissionsUtilAuth;