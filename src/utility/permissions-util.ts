import axios from "axios";
import Redis, { Redis as RedisClient } from "ioredis"; 
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";
import logger from '../plugins/logger-plugin';

dotenv.config();
const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;

let redisClient: RedisClient | null = null;
let getRedisDataClient: RedisClient | null = null;

function logRedisEvents(redis: RedisClient, label: string) {
  redis.on('connect', () => {
    logger.info(`${label} ✅ Connected to Redis successfully!`);
  });

  redis.on('ready', () => {
    logger.info(`${label} ✅ Redis connection is ready and operational.`);
  });

  redis.on('reconnecting', () => {
    logger.warn(`${label} ⏳ Reconnecting to Redis...`);
  });

  redis.on('close', () => {
    logger.warn(`${label} ❌ Redis connection closed.`);
  });

  redis.on('end', () => {
    logger.warn(`${label} ❌ Redis connection ended.`);
  });

  redis.on('error', (err) => {
    logger.error(`${label} ❌ Redis connection error: ${err.message || err}`);
  });

  redis.on('message', (channel, message) => {
    logger.debug(`${label} 📨 Message received on channel ${channel}: ${message}`);
  });
}

async function connectToRedis() {
  // Reuse existing connection if available and operational
  if (redisClient && redisClient.status === 'ready' && getRedisDataClient && getRedisDataClient.status === 'ready') {
    logger.info("✅ Reusing existing Redis connections.");
    return { redis: redisClient, getRedisData: getRedisDataClient };
  }

  logger.info(`Connecting to Redis at ${redis_host}:${redis_port}...`);

  try {
    // Connect to main Redis instance
    redisClient = new Redis({
      host: redis_host,
      port: redis_port,
      password: redis_auth,
      connectTimeout: 120000, // Increase connection timeout to 2 minutes
      commandTimeout: 30000,  // Increase command timeout to 30 seconds
      maxRetriesPerRequest: 10, // Maximum retries for each request
      retryStrategy: (times) => Math.min(times * 1000, 3000), // Exponential backoff for retry
    });

    // Connect to Redis replica instance
    getRedisDataClient = new Redis({
      host: redis_replica_host,
      port: redis_port,
      password: redis_auth,
      connectTimeout: 120000,
      commandTimeout: 30000,
      maxRetriesPerRequest: 10,
      retryStrategy: (times) => Math.min(times * 1000, 3000),
    });

    // Log detailed Redis events
    logRedisEvents(redisClient, "Main Redis");
    logRedisEvents(getRedisDataClient, "Redis Replica");

    // Perform a simple ping to ensure Redis is responsive
    const pingResponse = await redisClient.ping();
    logger.info(`Main Redis Ping Response: ${pingResponse}`);

  } catch (error:any) {
    logger.error("❌ Redis Connection Error:", error.message || error);
    throw new Error("Unable to connect to Redis");
  }

  return { redis: redisClient, getRedisData: getRedisDataClient };
}

async function getPolicies(redisClients: { redis: Redis, getRedisData: Redis }, fastify: any, programId: string, token: string) {
  if (!programId || !token) {
    throw new Error("Missing programId or token");
  }

  const { redis, getRedisData } = redisClients;
  let groupPolicies = null;
  const redisKey = getRedisKeyForAuth(token, programId, null);
  logger.info(`Fetching Redis key: ${redisKey}`);

  try {
    // Try to get policies from Redis cache
    const cachedPolicies = await redis.get(redisKey);
    if (cachedPolicies) {
      groupPolicies = JSON.parse(cachedPolicies);
      logger.info("✅ Policies fetched from Redis cache.");
      return groupPolicies;
    }
  } catch (err) {
    logger.error("❌ Error fetching from Redis:", err.message || err);
  }

  try {
    // Fetch policies from external API if not in cache
    const { data } = await axios.get(
      `${auth_url}/auth/v1/api/policy/user/tenant/${programId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    groupPolicies = data.response;

    // Cache the policies in Redis for 1 hour (3600 seconds)
    await redis.set(redisKey, JSON.stringify(groupPolicies), "EX", 3600);
    logger.info("✅ Policies cached in Redis.");

  } catch (err:any) {
    logger.error("❌ Error fetching policies from API:", err.message || err);
    throw new Error("Unable to fetch policies");
  }

  return groupPolicies;
}

// Main function to initialize Redis connections and fetch policies
async function permissionsUtilAuth(fastify: any, opts: any) {
  try {
    const redisClients = await connectToRedis();
    return {
      getPolicies: (programId: string, token: string) =>
        getPolicies(redisClients, fastify, programId, token),
    };
  } catch (error:any) {
    logger.error("❌ Redis connection failed:", error.message || error);
    // throw new Error("Redis connection failed");
  }
}

export default permissionsUtilAuth;
