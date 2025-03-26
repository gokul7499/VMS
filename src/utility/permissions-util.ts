import Redis, { RedisOptions } from 'ioredis';
import axios from 'axios';
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";
import logger from '../plugins/logger-plugin';

dotenv.config();
const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;

class AWSElastiCacheConnectionManager {
  private static instance: AWSElastiCacheConnectionManager;
  private primaryClient: Redis | null = null;
  private replicaClient: Redis | null = null;

  private constructor() { }

  // Singleton pattern
  public static getInstance(): AWSElastiCacheConnectionManager {
    if (!AWSElastiCacheConnectionManager.instance) {
      AWSElastiCacheConnectionManager.instance = new AWSElastiCacheConnectionManager();
    }
    return AWSElastiCacheConnectionManager.instance;
  }

  // Simplified Redis configuration
  private getRedisConfig(clientType: string): RedisOptions {
    return {
      host: clientType === 'Primary' ? redis_host : redis_replica_host,
      port: redis_port,
      password: redis_auth,
      connectTimeout: 20000,
      commandTimeout: 10000,
      maxRetriesPerRequest: 2,
      enableAutoPipelining: true,
      retryStrategy: (times) => {
        const delay = Math.min(
          Math.pow(2, times) * 1000 + Math.random() * 1000,
          60000
        );

        logger.warn(`${clientType} ElastiCache connection retry`, {
          attempts: times,
          delay
        });

        return times > 5 ? null : delay;
      }
    };
  }

  // Create Redis client with proper logging
  private createClient(clientType: string): Redis {
    const config = this.getRedisConfig(clientType);
    const client = new Redis(config);

    client.on('connect', () => {
      logger.info(`✅ Connected to ${clientType} ElastiCache successfully!`, {
        host: config.host
      });
    });

    client.on('error', (err) => {
      logger.error(`❌ ${clientType} ElastiCache connection error`, {
        error: err.message,
        host: config.host,
        stack: err.stack
      });
    });

    client.on('close', () => {
      logger.warn(`${clientType} ElastiCache connection closed`, {
        host: config.host
      });
    });

    return client;
  }

  // Initialize connections with proper error handling
  public async initializeReplicaConnection(): Promise<void> {
    try {
      await this.closeConnections();
      // if (this.replicaClient) {
      //   return; // Already initialized
      // }

      this.replicaClient = this.createClient('Replica');
      await this.verifyConnection(this.replicaClient, 'Replica');

      logger.info('ElastiCache replica connection established successfully');
    } catch (error) {
      logger.error('ElastiCache replica connection initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        replicaHost: redis_replica_host
      });
      throw error;
    }
  }

  public async initializePrimaryConnection(): Promise<void> {
    try {
      if (this.primaryClient) {
        return; // Already initialized
      }

      this.primaryClient = this.createClient('Primary');
      await this.verifyConnection(this.primaryClient, 'Primary');

      logger.info('ElastiCache primary connection established successfully');
    } catch (error) {
      logger.error('ElastiCache primary connection initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        primaryHost: redis_host
      });
      throw error;
    }
  }

  // Verify connection with timeout
  private async verifyConnection(
    client: Redis,
    clientType: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${clientType} ElastiCache connection verification timed out`));
      }, 30000);

      client.ping()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  // Get policies with optimized caching strategy - only initializing primary when needed
  public async getPolicies(programId: string, token: string): Promise<any> {
    // First, initialize only the replica connection for reading
    if (!this.replicaClient) {
      await this.initializeReplicaConnection();
    }

    if (!programId || !token) {
      throw new Error("Missing programId or token");
    }

    const redisKey = this.generateRedisKey(programId, token);

    try {
      // Try replica first for read operations
      const cachedPolicies = await this.replicaClient?.get(redisKey);
      if (cachedPolicies) {
        return JSON.parse(cachedPolicies);
      }

      // Fetch from API if not in cache
      const { data } = await axios.get(
        `${auth_url}/v1/api/policy/user/tenant/${programId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }
      );

      // Initialize primary connection ONLY when we need to write to Redis
      if (!this.primaryClient) {
        await this.initializePrimaryConnection();
      }

      // Cache policies on primary
      await this.primaryClient?.set(
        redisKey,
        JSON.stringify(data.response),
        'EX',
        3600 // 1 hour expiration
      );

      return data.response;
    } catch (error) {
      logger.error('Policy fetching error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        programId,
        tokenHash: this.hashToken(token)
      });
      throw error;
    }
  }

  // Simple key generation
  private generateRedisKey(programId: string, token: string): string {
    return `policies:${programId}:${this.hashToken(token)}`;
  }

  // Efficient token hashing
  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // Clean shutdown of connections
  public async closeConnections(): Promise<void> {
    try {
      const closePromises = [];

      if (this.primaryClient) {
        closePromises.push(this.primaryClient.quit().catch(() => { }));
        this.primaryClient = null;
      }

      if (this.replicaClient) {
        closePromises.push(this.replicaClient.quit().catch(() => { }));
        this.replicaClient = null;
      }

      if (closePromises.length > 0) {
        await Promise.all(closePromises);
      }
    } catch (error) {
      logger.error('Error closing ElastiCache connections', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async shutdown(): Promise<void> {
    await this.closeConnections();
    logger.info('ElastiCache connections closed');
  }
}

// Singleton export
export const elastiCacheConnectionManager = AWSElastiCacheConnectionManager.getInstance();

// Initialization wrapper - only initialize the replica by default
export async function initializeElastiCacheConnections() {
  try {
    // Only initialize the replica connection by default for reading
    await elastiCacheConnectionManager.initializeReplicaConnection();
  } catch (error) {
    logger.error('ElastiCache replica initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}