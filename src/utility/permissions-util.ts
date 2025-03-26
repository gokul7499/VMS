import axios from "axios";
import Redis from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";
import logger from '../plugins/logger-plugin';

dotenv.config();
const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;

// Define types
interface RedisClients {
  redis: Redis;
  getRedisData: Redis;
}

interface HealthStatus {
  primary: boolean;
  replica: boolean;
}

interface FastifyInstance {
  // Minimal FastifyInstance type - expand as needed
  [key: string]: any;
}

// Common Redis configuration to avoid duplication
const createRedisClient = (host: string): Redis => {
  return new Redis({
    host,
    port: redis_port,
    password: redis_auth,
    connectTimeout: 30000,
    commandTimeout: 5000,
    retryStrategy: (times: number): number => {
      const delay = Math.min(times * 50, 2000);
      logger.info(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    autoResubscribe: true
  });
};

// Connection singleton pattern
let redisConnection: RedisClients | null = null;

async function connectToRedis(): Promise<RedisClients> {
  // Return existing connection if available
  if (redisConnection &&
    redisConnection.redis.status === 'ready' &&
    redisConnection.getRedisData.status === 'ready') {
    return redisConnection;
  }

  logger.info(`Initializing Redis connections to ${redis_host}:${redis_port} and replica`);

  const redis = createRedisClient(redis_host);
  const getRedisData = createRedisClient(redis_replica_host);

  // Set up event handlers
  const setupEventHandlers = (client: Redis, name: string): void => {
    client.on("connect", () => {
      logger.info(`✅ Connected to ${name}`);
    });

    client.on("ready", () => {
      logger.info(`✅ ${name} connection ready`);
    });

    client.on("error", (err: Error) => {
      logger.error(`❌ ${name} connection error:`, err.message);
    });

    client.on("close", () => {
      logger.warn(`⚠️ ${name} connection closed`);
    });

    client.on("reconnecting", () => {
      logger.info(`🔄 Reconnecting to ${name}...`);
    });
  };

  setupEventHandlers(redis, "Redis primary");
  setupEventHandlers(getRedisData, "Redis replica");

  try {
    // Attempt ping with timeout
    const pingPromise = redis.ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis ping timeout")), 5000)
    );

    const pingResponse = await Promise.race([pingPromise, timeoutPromise]);
    logger.info(`Redis Ping Response: ${pingResponse}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Redis Ping Failed: ${errorMessage}`);
  }

  redisConnection = { redis, getRedisData };
  return redisConnection;
}

/**
 * Validates input parameters for policy fetching
 */

function validatePolicyInputs(programId: string, token: string): void {
  if (!programId || typeof programId !== 'string') {
    throw new Error("Invalid programId");
  }

  if (!token || typeof token !== 'string') {
    throw new Error("Invalid token");
  }
}

/**
 * Attempts to fetch policies from cache
 * @returns The cached policies or null if not found or error
 */

async function fetchPoliciesFromCache(redisClients: RedisClients, redisKey: string): Promise<any> {
  const { redis, getRedisData } = redisClients;

  try {
    // Use replica for read operations when available
    const client = getRedisData.status === 'ready' ? getRedisData : redis;
    const cachedPolicies = await client.get(redisKey);

    if (cachedPolicies) {
      try {
        const policies = JSON.parse(cachedPolicies);
        logger.debug("✅ Using cached policies");
        return policies;
      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        logger.warn("⚠️ Invalid JSON in Redis cache:", errorMessage);
      }
    }
  } catch (redisError: unknown) {
    const errorMessage = redisError instanceof Error ? redisError.message : String(redisError);
    logger.warn("⚠️ Redis read error:", errorMessage);
  }

  return null;
}

/**
 * Caches policies in Redis
 */

async function cachePolicies(redis: Redis, redisKey: string, policies: any): Promise<void> {
  try {
    await redis.set(redisKey, JSON.stringify(policies), "EX", 3600);
    logger.debug("✅ Policies cached in Redis");
  } catch (cacheError: unknown) {
    const errorMessage = cacheError instanceof Error ? cacheError.message : String(cacheError);
    logger.warn("⚠️ Failed to cache policies:", errorMessage);
  }
}

/**
 * Fetches policies from API
 */

async function fetchPoliciesFromAPI(programId: string, token: string): Promise<any> {
  const apiUrl = `${auth_url}/auth/v1/api/policy/user/tenant/${programId}`;
  logger.debug(`Fetching policies from API: ${apiUrl}`);

  try {
    const { data } = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000 // Add request timeout
    });

    if (!data?.response) {
      throw new Error("Invalid API response format");
    }

    return data.response;
  } catch (apiError: unknown) {
    let errorDetail;
    if (apiError instanceof Error) {
      errorDetail = apiError.message;
    } else {
      errorDetail = String(apiError);
    }

    const errorMessage = axios.isAxiosError(apiError)
      ? apiError.response?.data?.message || apiError.message
      : errorDetail;

    logger.error(`❌ API fetch error: ${errorMessage}`);
    throw new Error(`Unable to fetch policies: ${errorMessage}`);
  }
}

/**
 * Fetches policies from cache or API
 * @param {RedisClients} redisClients - Redis client instances
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {string} programId - Program identifier
 * @param {string} token - Authentication token
 * @returns {Promise<object>} - Policies object
 */

async function getPolicies(redisClients: RedisClients, fastify: FastifyInstance, programId: string, token: string): Promise<any> {
  validatePolicyInputs(programId, token);

  const redisKey = getRedisKeyForAuth(token, programId, null);
  logger.debug(`Fetching policies with key: ${redisKey}`);

  // Try cache first
  const cachedPolicies = await fetchPoliciesFromCache(redisClients, redisKey);
  if (cachedPolicies) {
    return cachedPolicies;
  }

  // Fallback to API
  const groupPolicies = await fetchPoliciesFromAPI(programId, token);

  // Cache the result
  await cachePolicies(redisClients.redis, redisKey, groupPolicies);

  return groupPolicies;
}

/**
 * Initialize permissions utility with lazy-loaded Redis connection
 */

async function permissionsUtilAuth(fastify: FastifyInstance, opts: Record<string, any> = {}) {
  // Lazy load Redis connection when actually needed
  return {
    getPolicies: async (programId: string, token: string): Promise<any> => {
      const redisClients = await connectToRedis();
      return getPolicies(redisClients, fastify, programId, token);
    },

    // Add a healthcheck method
    healthcheck: async (): Promise<HealthStatus> => {
      const clients = await connectToRedis();
      return {
        primary: clients.redis.status === 'ready',
        replica: clients.getRedisData.status === 'ready'
      };
    },

    // Add method to clear cache
    clearCache: async (programId: string, token: string): Promise<number> => {
      const clients = await connectToRedis();
      const redisKey = getRedisKeyForAuth(token, programId, null);
      return clients.redis.del(redisKey);
    },

    // Add method to shutdown connections
    shutdown: async (): Promise<void> => {
      if (redisConnection) {
        await redisConnection.redis.quit();
        await redisConnection.getRedisData.quit();
        redisConnection = null;
        logger.info("Redis connections closed");
      }
    }
  };
}

export default permissionsUtilAuth;