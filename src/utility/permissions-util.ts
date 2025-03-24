import axios from "axios";
import Redis, { Redis as RedisClient } from "ioredis"; // Import Redis type from ioredis
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";
import logger from '../plugins/logger-plugin';

dotenv.config();
const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;

let redisClient: RedisClient | null = null; // Explicitly type the redisClient
let getRedisDataClient: RedisClient | null = null; // Explicitly type the getRedisDataClient

async function connectToRedis() {
  // Check if the main Redis client already exists
  if (redisClient && redisClient.status === 'ready' && getRedisDataClient && getRedisDataClient.status === 'ready') {
    logger.info("✅ Reusing existing Redis connection.");
    return { redis: redisClient, getRedisData: getRedisDataClient };
  }

  logger.info(`Connecting to Redis at ${redis_host}:${redis_port}`);

  // If not, create a new Redis client instance
  redisClient = new Redis({
    host: redis_host,
    port: redis_port,
    password: redis_auth,
    connectTimeout: 60000,
    commandTimeout: 10000,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  getRedisDataClient = new Redis({
    host: redis_replica_host,
    port: redis_port,
    password: redis_auth,
    connectTimeout: 60000,
    commandTimeout: 10000,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  redisClient.on("connect", () => {
    logger.info("✅ Connected to Redis successfully!");
  });

  redisClient.on("error", (err) => {
    logger.error("❌ Redis connection error:", err);
  });

  getRedisDataClient.on("connect", () => {
    logger.info("✅ Connected to Redis replica successfully!");
  });

  getRedisDataClient.on("error", (err) => {
    logger.error("❌ Redis replica connection error:", err);
  });

  try {
    const pingResponse = await redisClient.ping();
    logger.info(`Redis Ping Response: ${pingResponse}`);
  } catch (error) {
    logger.error("❌ Redis Ping Failed:", error);
  }

  return { redis: redisClient, getRedisData: getRedisDataClient };
}

async function getPolicies(redisClients: { redis: RedisClient, getRedisData: RedisClient }, fastify: any, programId: string, token: string) {
  if (!programId || !token) {
    throw new Error("Missing programId or token");
  }

  const { redis, getRedisData } = redisClients;
  let groupPolicies = null;
  const redisKey = getRedisKeyForAuth(token, programId, null);
  logger.info("Fetching Redis key:", redisKey);

  try {
    const cachedPolicies = await redis.get(redisKey);
    if (cachedPolicies) {
      groupPolicies = JSON.parse(cachedPolicies);
      logger.info("✅ Policies fetched from Redis cache.");
      return groupPolicies;
    }
  } catch (err) {
    logger.error("❌ Error fetching from Redis:", err);
  }

  try {
    const { data } = await axios.get(
      `${auth_url}/auth/v1/api/policy/user/tenant/${programId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    groupPolicies = data.response;

    await redis.set(redisKey, JSON.stringify(groupPolicies), "EX", 3600);
    logger.info("✅ Policies cached in Redis.");
  } catch (err) {
    logger.error("❌ Error fetching policies from API:", err);
    throw new Error("Unable to fetch policies");
  }

  return groupPolicies;
}

async function permissionsUtilAuth(fastify: any, opts: any) {
  const redisClients = await connectToRedis();
  if (!redisClients.getRedisData) {
    console.log('Redis replica connection is not available')
    // throw new Error("Redis replica connection is not available");
  }
  return {
    getPolicies: (programId: string, token: string) =>
      getPolicies(redisClients, fastify, programId, token),
  };
}

export default permissionsUtilAuth;
