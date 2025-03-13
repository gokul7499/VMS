import axios from "axios";
import Redis from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";

dotenv.config();

async function connectToRedis() {
  const { redis_host, redis_port, redis_auth } = databaseConfig.config;

  console.log(`Connecting to Redis at ${redis_host}:${redis_port}`);

  const redis = new Redis({
    host: redis_host,
    port: redis_port,
    password: redis_auth,
    connectTimeout: 30000, // 30s connection timeout
    commandTimeout: 10000, // 10s command timeout
    retryStrategy: (times) => Math.min(times * 50, 2000), // Retry with delay
  });

  redis.on("connect", () => {
    console.log("✅ Connected to Redis successfully!");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis connection error:", err);
  });

  try {
    const pingResponse = await redis.ping();
    console.log(`Redis Ping Response: ${pingResponse}`);
  } catch (error) {
    console.error("❌ Redis Ping Failed:", error);
  }

  return redis;
}

async function getPolicies(redis: Redis, fastify: any, programId: string, token: string) {
  if (!programId || !token) {
    throw new Error("Missing programId or token");
  }

  let groupPolicies = null;
  let redisKey;

  try {
    redisKey = getRedisKeyForAuth(token, programId, null);
    console.log("Fetching Redis key for auth:", redisKey);

    const exists = await redis.exists(redisKey);
    if (exists) {
      const cachedPolicies = await redis.get(redisKey);
      console.log("Fetched policies from cache:", cachedPolicies);

      if (cachedPolicies) {
        groupPolicies = JSON.parse(cachedPolicies);
        if (fastify.log) {
          fastify.log.info("Fetched policies from cache");
        }
      }
    } else {
      console.log("Key does not exist in Redis, fetching from API...");
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
      console.log("Fetched policies from API:", groupPolicies);

      if (redisKey) {
        try {
          await redis.set(redisKey, JSON.stringify(groupPolicies), "EX", 3600); // Cache for 1 hour
          console.log("Successfully cached policies in Redis");
        } catch (cacheError) {
          console.error("❌ Error caching policies in Redis:", cacheError);
        }
      } else {
        console.log("Unable to cache policies: redisKey is undefined");
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
  const redis = await connectToRedis();
  return {
    getPolicies: (programId: string, token: string) =>
      getPolicies(redis, fastify, programId, token),
  };
}

export default permissionsUtilAuth;