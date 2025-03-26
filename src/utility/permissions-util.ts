import Redis, { RedisOptions } from 'ioredis';
import axios from 'axios';
import { getRedisKeyForAuth } from "./get-redis-key";
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";
import logger from '../plugins/logger-plugin';

dotenv.config();
const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;
class AWSElastiCacheConnectionManager {
  private static instance: AWSElastiCacheConnectionManager;
  private primaryClient: Redis | null = null;
  private replicaClient: Redis | null = null;
  // AWS ElastiCache specific configuration
  private constructor() {}
  public static getInstance(): AWSElastiCacheConnectionManager {
    if (!AWSElastiCacheConnectionManager.instance) {
      AWSElastiCacheConnectionManager.instance = new AWSElastiCacheConnectionManager();
    }
    return AWSElastiCacheConnectionManager.instance;
  }
  private getElastiCacheRedisConfig(host: string, clientType: string): RedisOptions {
    return {
      host: redis_host,
      port: redis_port, // Standard ElastiCache port
      password: redis_auth, // Ensure this is your ElastiCache authentication token
      tls: {}, // Enable TLS for ElastiCache
      connectTimeout: 20000,      // Increased to 30 seconds
      commandTimeout: 10000,      // Increased to 20 seconds
      maxRetriesPerRequest: 2,
      enableAutoPipelining: true,
      retryStrategy: (times) => {
        // Advanced retry strategy with exponential backoff
        const delay = Math.min(
          Math.pow(2, times) * 1000 + Math.random() * 1000, 
          60000 // Max 60 seconds
        );
        
        console.warn(`${clientType} ElastiCache connection retry`, {
          attempts: times,
          delay: delay
        });
        
        if (times > 5) {
          console.error(`${clientType} ElastiCache connection failed after max attempts`);
          return null;
        }
        
        return delay;
      }
    };
  }
  private createElastiCacheClient(host: string, clientType: string): Redis {
    const client = new Redis(this.getElastiCacheRedisConfig(host, clientType));
    this.setupClientListeners(client, clientType);
    return client;
  }
  private setupClientListeners(client: Redis, clientType: string): void {
    client.on('connect', () => {
      console.info(`✅ Connected to ${clientType} ElastiCache successfully!`, {
        host: client.options.host
      });
    });
    client.on('error', (err) => {
      console.error(`❌ ${clientType} ElastiCache connection error`, {
        error: err.message,
        host: client.options.host,
        port: client.options.port,
        stack: err.stack
      });
    });
    client.on('close', () => {
      console.warn(`${clientType} ElastiCache connection closed`, {
        host: client.options.host
      });
    });
  }
  public async initializeConnections(): Promise<void> {
    try {
      // Close existing connections
      await this.closeConnections();
      // Create new ElastiCache clients
      this.primaryClient = this.createElastiCacheClient(
        redis_host, 
        'Primary'
      );
      this.replicaClient = this.createElastiCacheClient(
        redis_replica_host, 
        'Replica'
      );
      // Comprehensive connection verification
      await Promise.all([
        this.verifyElastiCacheConnection(this.primaryClient, 'Primary'),
        this.verifyElastiCacheConnection(this.replicaClient, 'Replica')
      ]);
      console.info('ElastiCache connections established successfully');
    } catch (error) {
      console.error('ElastiCache connection initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        primaryHost: redis_host,
        replicaHost: redis_replica_host
      });
      throw error;
    }
  }
  private async verifyElastiCacheConnection(
    client: Redis, 
    clientType: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.error(`${clientType} ElastiCache connection verification timeout`, {
          host: client.options.host,
          port: client.options.port
        });
        reject(new Error(`${clientType} ElastiCache connection verification timed out`));
      }, 30000); // 30 seconds timeout
      client.ping()
        .then(() => {
          clearTimeout(connectionTimeout);
          resolve();
        })
        .catch((err) => {
          clearTimeout(connectionTimeout);
          console.error(`${clientType} ElastiCache ping failed`, {
            error: err.message,
            host: client.options.host,
            port: client.options.port
          });
          reject(err);
        });
    });
  }
  public async getPolicies(programId: string, token: string): Promise<any> {
    // Ensure connections are initialized
    if (!this.primaryClient || !this.replicaClient) {
      await this.initializeConnections();
    }
    if (!programId || !token) {
      throw new Error("Missing programId or token");
    }
    try {
      // Try fetching from replica first
      const cachedPolicies = await this.replicaClient?.get(
        this.generateRedisKey(programId, token)
      );
      if (cachedPolicies) {
        return JSON.parse(cachedPolicies);
      }
      // Fetch from API if not in cache
      const { data } = await this.fetchPoliciesFromAPI(programId, token);
      // Cache policies on primary
      await this.primaryClient?.set(
        this.generateRedisKey(programId, token),
        JSON.stringify(data.response),
        'EX',
        3600 // 1 hour expiration
      );
      return data.response;
    } catch (error) {
      console.error('Policy fetching error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        programId,
        tokenHash: this.hashToken(token)
      });
      throw error;
    }
  }
  private generateRedisKey(programId: string, token: string): string {
    return `policies:${programId}:${this.hashToken(token)}`;
  }
  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
  private async fetchPoliciesFromAPI(programId: string, token: string) {
    console.log('URL:', `${auth_url}/v1/api/policy/user/tenant/${programId}`)
    return axios.get(
      `${auth_url}/v1/api/policy/user/tenant/${programId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 // 15 seconds timeout
      }
    );
  }
  public async closeConnections(): Promise<void> {
    try {
      if (this.primaryClient) {
        await this.primaryClient.quit();
        this.primaryClient = null;
      }
      if (this.replicaClient) {
        await this.replicaClient.quit();
        this.replicaClient = null;
      }
    } catch (error) {
      console.error('Error closing ElastiCache connections', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  public async shutdown(): Promise<void> {
    await this.closeConnections();
    console.info('ElastiCache connections closed');
  }
}
// Singleton export
export const elastiCacheConnectionManager = AWSElastiCacheConnectionManager.getInstance();
// Initialization wrapper
export async function initializeElastiCacheConnections() {
  try {
    await elastiCacheConnectionManager.initializeConnections();
  } catch (error) {
    console.error('ElastiCache initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}












// import axios from "axios";
// import Redis from "ioredis";
// import { getRedisKeyForAuth } from "./get-redis-key";
// import { databaseConfig } from "../config/db";
// import dotenv from "dotenv";
// import logger from '../plugins/logger-plugin';

// dotenv.config();
// const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;

// async function connectToRedis() {
//   logger.info(`Connecting to Redis at ${redis_host}:${redis_port}`);

//   const redis = new Redis({
//     host: redis_host,
//     port: redis_port,
//     password: redis_auth,
//     connectTimeout: 60000,
//     commandTimeout: 10000,
//     retryStrategy: (times) => Math.min(times * 50, 2000),
//   });

//   const getRedisData = new Redis({
//     host: redis_replica_host,
//     port: redis_port,
//     password: redis_auth,
//     connectTimeout: 60000,
//     commandTimeout: 10000,
//     retryStrategy: (times) => Math.min(times * 50, 2000),
//   });

//   redis.on("connect", () => {
//     logger.info("✅ Connected to Redis successfully!");
//   });

//   redis.on("error", (err) => {
//     logger.error("❌ Redis connection error:", err);
//   });

//   getRedisData.on("connect", () => {
//     logger.info("✅ Connected to Redis replica successfully!");
//   });

//   getRedisData.on("error", (err) => {
//     logger.error("❌ Redis replica connection error:", err);
//   });

//   try {
//     const pingResponse = await redis.ping();
//     logger.info(`Redis Ping Response: ${pingResponse}`);
//   } catch (error) {
//     logger.error("❌ Redis Ping Failed:", error);
//   }

//   return { redis, getRedisData };
// }

// async function getPolicies(redisClients: { redis: Redis, getRedisData: Redis }, fastify: any, programId: string, token: string) {
//   if (!programId || !token) {
//     throw new Error("Missing programId or token");
//   }

//   const { redis, getRedisData } = redisClients;
//   let groupPolicies = null;
//   const redisKey = getRedisKeyForAuth(token, programId, null);
//   logger.info("Fetching Redis key:", redisKey);

//   try {
//     const cachedPolicies = await redis.get(redisKey);
//     if (cachedPolicies) {
//       groupPolicies = JSON.parse(cachedPolicies);
//       logger.info("✅ Policies fetched from Redis cache.");
//       return groupPolicies;
//     }
//   } catch (err) {
//     logger.error("❌ Error fetching from Redis:", err);
//   }

//   try {
//     const { data } = await axios.get(
//       `${auth_url}/auth/v1/api/policy/user/tenant/${programId}`,
//       {
//         headers: { Authorization: `Bearer ${token}` }
//       }
//     );

//     groupPolicies = data.response;

//     await redis.set(redisKey, JSON.stringify(groupPolicies), "EX", 3600);
//     logger.info("✅ Policies cached in Redis.");
//   } catch (err) {
//     logger.error("❌ Error fetching policies from API:", err);
//     throw new Error("Unable to fetch policies");
//   }

//   return groupPolicies;
// }

// async function permissionsUtilAuth(fastify: any, opts: any) {
//   const redisClients = await connectToRedis();
//   return {
//     getPolicies: (programId: string, token: string) =>
//       getPolicies(redisClients, fastify, programId, token),
//   };
// }

// export default permissionsUtilAuth;