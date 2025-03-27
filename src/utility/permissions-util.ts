import Redis, { RedisOptions } from 'ioredis';
import axios from 'axios';
import { databaseConfig } from "../config/db";
import dotenv from "dotenv";

dotenv.config();
const { redis_host, redis_port, redis_auth, redis_replica_host, auth_url } = databaseConfig.config;

class AWSElastiCacheConnectionManager {
  private static instance: AWSElastiCacheConnectionManager;
  private primaryClient: Redis | null = null;
  private replicaClient: Redis | null = null;

  private constructor() { }

  public static getInstance(): AWSElastiCacheConnectionManager {
    if (!AWSElastiCacheConnectionManager.instance) {
      AWSElastiCacheConnectionManager.instance = new AWSElastiCacheConnectionManager();
    }
    return AWSElastiCacheConnectionManager.instance;
  }

  private getElastiCacheRedisConfig(host: string, clientType: string): RedisOptions {
    return {
      host: host,
      port: redis_port,
      password: redis_auth,
      tls: {},
      connectTimeout: 20000,
      commandTimeout: 10000,
      maxRetriesPerRequest: 2,
      enableAutoPipelining: true,
      retryStrategy: (times) => {
        const delay = Math.min(
          Math.pow(2, times) * 1000 + Math.random() * 1000,
          60000
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
      await this.closeConnections();
      this.replicaClient = this.createElastiCacheClient(
        redis_replica_host,
        'Replica'
      );
      await this.verifyElastiCacheConnection(this.replicaClient, 'Replica');
      console.info('Replica ElastiCache connection established successfully');
    } catch (error) {
      console.error('ElastiCache connection initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        replicaHost: redis_replica_host
      });
      throw error;
    }
  }

  private async createPrimaryClientIfNeeded(): Promise<Redis> {
    await this.closeConnections();
    if (!this.primaryClient) {
      this.primaryClient = this.createElastiCacheClient(
        redis_host,
        'Primary'
      );
      await this.verifyElastiCacheConnection(this.primaryClient, 'Primary');
    }
    return this.primaryClient;
  }

  private async verifyElastiCacheConnection(client: Redis, clientType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.error(`${clientType} ElastiCache connection verification timeout`, {
          host: client.options.host,
          port: client.options.port
        });
        reject(new Error(`${clientType} ElastiCache connection verification timed out`));
      }, 30000);

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
          reject(err instanceof Error ? err : new Error(err?.toString() || `${clientType} ElastiCache ping failed`));
        });
    });
  }

  public async getPolicies(programId: string, token: string): Promise<any> {
    // Ensure replica connection is initialized for reading
    if (!this.replicaClient) {
      await this.initializeConnections();
    }

    if (!programId || !token) {
      throw new Error("Missing programId or token");
    }

    try {

      const cachedPolicies = await this.replicaClient?.get(
        this.generateRedisKey(programId, token)
      );

      if (cachedPolicies) {
        return JSON.parse(cachedPolicies);
      }

      const { data } = await this.fetchPoliciesFromAPI(programId, token);

      // Create primary client only when setting the key
      const primaryClient = await this.createPrimaryClientIfNeeded();

      // Cache policies on primary
      await primaryClient.set(
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
    console.log('URL:', `${auth_url}/v1/api/policy/user/tenant/${programId}`);
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