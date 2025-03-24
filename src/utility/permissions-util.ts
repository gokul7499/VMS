import axios from "axios";
import Redis, { Redis as RedisClient } from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";
import logger from '../plugins/logger-plugin';

// Custom error class for Redis-related errors
class RedisConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisConnectionError';
  }
}

// Configuration interface
interface RedisConnectionConfig {
  host: string;
  port: number;
  password: string;
  connectTimeout?: number;
  commandTimeout?: number;
  retryStrategy?: (times: number) => number;
}

// Singleton class to manage Redis connections
class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private mainClient: Redis | null = null;
  private replicaClient: Redis | null = null;

  private constructor() {}

  // Singleton instance method
  public static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  // Create Redis connection configuration
  private createRedisConfig(host: string): RedisConnectionConfig {
    const { redis_port, redis_auth } = databaseConfig.config;
    
    return {
      host,
      port: Number(redis_port),
      password: redis_auth,
      connectTimeout: 60000,
      commandTimeout: 10000,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    };
  }

  // Set up connection event listeners
  private setupConnectionListeners(client: Redis, clientType: string) {
    client.on("connect", () => {
      logger.info(`✅ Connected to ${clientType} Redis successfully!`);
    });

    client.on("error", (err) => {
      logger.error(`❌ ${clientType} Redis connection error:`, err);
    });
  }

  // Connect to Redis or return existing connection
  public async connectToRedis(): Promise<{ redis: Redis, getRedisData: Redis }> {
    const { redis_host, redis_replica_host } = databaseConfig.config;

    // If both clients are already connected, return them
    if (this.mainClient?.status === 'ready' && this.replicaClient?.status === 'ready') {
      logger.info("✅ Reusing existing Redis connections");
      return { 
        redis: this.mainClient, 
        getRedisData: this.replicaClient 
      };
    }

    // Create main Redis client
    this.mainClient = new Redis(this.createRedisConfig(redis_host));
    this.setupConnectionListeners(this.mainClient, "Main");

    // Create replica Redis client
    this.replicaClient = new Redis(this.createRedisConfig(redis_replica_host));
    this.setupConnectionListeners(this.replicaClient, "Replica");

    try {
      // Parallel connection and ping
      await Promise.all([
        this.mainClient.ping(),
        this.replicaClient.ping()
      ]);

      logger.info("✅ Redis connections established and verified");

      return { 
        redis: this.mainClient, 
        getRedisData: this.replicaClient 
      };

    } catch (error) {
      logger.error("❌ Redis connection failed:", error);
      throw new RedisConnectionError("Failed to establish Redis connections");
    }
  }

  // Close Redis connections
  public async closeConnections() {
    try {
      if (this.mainClient) {
        await this.mainClient.quit();
        this.mainClient = null;
      }
      
      if (this.replicaClient) {
        await this.replicaClient.quit();
        this.replicaClient = null;
      }

      logger.info("✅ Redis connections closed successfully");
    } catch (error) {
      logger.error("❌ Error closing Redis connections:", error);
    }
  }
}

// Policy fetching function
async function getPolicies(
  redisClients: { redis: Redis, getRedisData: Redis }, 
  fastify: any, 
  programId: string, 
  token: string
) {
  // Input validation
  if (!programId || !token) {
    throw new Error("Missing programId or token");
  }

  const { redis } = redisClients;
  const redisKey = getRedisKeyForAuth(token, programId, null);
  logger.info(`Fetching Redis key: ${redisKey}`);

  try {
    // Try to fetch from Redis cache
    const cachedPolicies = await redis.get(redisKey);
    if (cachedPolicies) {
      logger.info("✅ Policies fetched from Redis cache.");
      return JSON.parse(cachedPolicies);
    }
  } catch (err) {
    logger.error("❌ Error fetching from Redis:", err);
  }

  try {
    // Fetch policies from API
    const { data } = await axios.get(
      `${databaseConfig.config.auth_url}/auth/v1/api/policy/user/tenant/${programId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const groupPolicies = data.response;

    // Cache policies in Redis
    await redis.set(redisKey, JSON.stringify(groupPolicies), "EX", 3600);
    logger.info("✅ Policies cached in Redis.");

    return groupPolicies;
  } catch (err) {
    logger.error("❌ Error fetching policies from API:", err);
    throw new Error("Unable to fetch policies");
  }
}

// Permissions utility initialization
async function permissionsUtilAuth(fastify: any, opts: any) {
  try {
    // Get Redis connection manager instance
    const connectionManager = RedisConnectionManager.getInstance();
    
    // Connect to Redis (or reuse existing connection)
    const redisClients = await connectionManager.connectToRedis();

    return {
      getPolicies: (programId: string, token: string) =>
        getPolicies(redisClients, fastify, programId, token),
      
      // Optional method to close connections when no longer needed
      closeConnections: () => connectionManager.closeConnections()
    };
  } catch (error) {
    logger.error("❌ Permissions utility initialization failed:", error);
    throw error;
  }
}

export default permissionsUtilAuth;
export { 
  RedisConnectionManager,
  RedisConnectionError 
};