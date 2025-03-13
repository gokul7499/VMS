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
    password: redis_auth
  });

  const getRedisData = new Redis({
    host: redis_replica_host,
    port: redis_port,
    password: redis_auth
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
  let redisKey;

  try {
    redisKey = getRedisKeyForAuth(token, programId, null);
    logger.info("Fetching Redis key for auth:", redisKey);

    const exists = await getRedisData.exists(redisKey);
    if (exists) {
      const cachedPolicies = await getRedisData.get(redisKey);
      logger.info("Fetched policies from cache:", cachedPolicies);

      if (cachedPolicies) {
        groupPolicies = JSON.parse(cachedPolicies);
        if (fastify.log) {
          fastify.log.info("Fetched policies from cache");
        }
      }
    } else {
      logger.info("Key does not exist in Redis, fetching from API...");
    }
  } catch (err) {
    console.error("❌ Error fetching from Redis:", err);
    if (fastify.log) {
      fastify.log.error(`Error fetching from Redis: ${err}`);
    }
  }

  if (!groupPolicies) {
    try {
      const apiResponse = await axios.get(
        `http://v4-devnlb.simplifysandbox.net:8006/auth/v1/api/policy/user/tenant/${programId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: { programId },
          timeout: 90000, // 90s timeout to avoid API delays
        }
      );
      groupPolicies = apiResponse.data.response;
      logger.info("Fetched policies from API:", groupPolicies);

      if (redisKey) {
        try {
          await redis.set(redisKey, JSON.stringify(groupPolicies), "EX", 3600); // Cache for 1 hour
          logger.info("Successfully cached policies in Redis");
        } catch (cacheError) {
          console.error("❌ Error caching policies in Redis:", cacheError);
        }
      } else {
        logger.info("Unable to cache policies: redisKey is undefined");
      }

      if (fastify.log) {
        fastify.log.info("Fetched policies from API");
      }
    } catch (err: any) {
      console.error("❌ Error fetching policies from API:", err);
      if (fastify.log) {
        fastify.log.error(`Error fetching policies from API: ${err}`);
      }
      throw new Error("Unable to fetch policies");
    }
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