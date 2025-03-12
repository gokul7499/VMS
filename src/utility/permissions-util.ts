import axios from "axios";
import Redis from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from '../config/db';
import dotenv from "dotenv";

dotenv.config();

async function connectToRedis() {
  const { redis_host, redis_port, redis_auth } = databaseConfig.config;
  console.log(`Connecting to Redis at ${redis_host}:${redis_port}`);
  const redis = new Redis({
    host: redis_host,
    port: redis_port,
    password: redis_auth
  });
  console.log('Connected to Redis');
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

    console.log("Fetching redis key for auth", redisKey);
    const cachedPolicies = await redis.get(redisKey);
    console.log(`Log of fetch policies from cache`, cachedPolicies);
    if (cachedPolicies) {
      groupPolicies = JSON.parse(cachedPolicies);
      console.log(`Fetched the policies from cache`, groupPolicies);
      if (fastify.log) {
        fastify.log.info(`Fetched the policies from cache`);
      }
    }
  } catch (err) {
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
          params: {
            programId,
          },
          timeout: 90000,
        }
      );
      groupPolicies = apiResponse.data.response;
      console.log(`Fetched policies from API`, groupPolicies);

      // Commenting out Redis-related code

      console.log(`Attempting to cache policies in Redis`);
      if (redisKey) {
        await redis.set(redisKey, JSON.stringify(groupPolicies));
        console.log(`Successfully cached policies in Redis`);
      } else {
        console.log(`Unable to cache policies: redisKey is undefined`);
      }

      if (fastify.log) {
        fastify.log.info(`Fetched policies from API`);
      }
    } catch (err: any) {
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
    getPolicies: (programId: string, token: string) => getPolicies(redis, fastify, programId, token),
  };
}

export default permissionsUtilAuth;