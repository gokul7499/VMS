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
      port:redis_port,
      // password: redis_auth,
      // tls: {},
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

  public async initializeConnections(): Promise<void> {
    try {
      await this.closeReplicaConnection();
      this.replicaClient = new Redis(
        this.getElastiCacheRedisConfig(redis_replica_host, 'Replica')
      );
      await this.verifyElastiCacheConnection(this.replicaClient, 'Replica');
      console.info('Replica ElastiCache connection established successfully');
    } catch (error) {
      console.error('ElastiCache replica connection initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        replicaHost: redis_replica_host
      });
      throw error;
    }
  }

  private async createPrimaryClient(): Promise<Redis> {
    // Close existing primary connection if any
    await this.closePrimaryConnection();

    // Create primary client
    const primaryClient = new Redis(
      this.getElastiCacheRedisConfig(redis_host, 'Primary')
    );

    // Verify primary connection
    await this.verifyElastiCacheConnection(primaryClient, 'Primary');

    return primaryClient;
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
    if (!this.replicaClient) {
      await this.initializeConnections();
    }

    if (!programId || !token) {
      throw new Error("Missing programId or token");
    }

    try {
      // Try to get from replica client
      const cachedPolicies = await this.replicaClient!.get(
        this.generateRedisKey(programId, token)
      );

      if (cachedPolicies) {
        return JSON.parse(cachedPolicies);
      }
      const { data } = await this.fetchPoliciesFromAPI(programId, token);
      console.log('data from auth service:', data);
      const primaryClient = await this.createPrimaryClient();
      await primaryClient.set(
        this.generateRedisKey(programId, token),
        JSON.stringify(data.response),
        'EX',
        3600 // 1 hour expiration
      );

      await primaryClient.quit();

      return data.response;
    } catch (error) {
      this.logDetailedError(error, programId, token);
      throw error;
    }
  }

  private async closeReplicaConnection(): Promise<void> {
    if (this.replicaClient) {
      try {
        await this.replicaClient.quit();
        this.replicaClient = null;
      } catch (error) {
        console.error('Error closing replica connection', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async closePrimaryConnection(): Promise<void> {
    if (this.primaryClient) {
      try {
        await this.primaryClient.quit();
        this.primaryClient = null;
      } catch (error) {
        console.error('Error closing primary connection', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private logDetailedError(error: any, programId: string, token: string): void {
    console.error('Policy fetching error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      programId,
      tokenHash: this.hashToken(token)
    });

    if (axios.isAxiosError(error)) {
      console.error('Axios error occurred:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout exceeded');
      }
    } else {
      console.error('Unexpected error:', error);
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

  public async shutdown(): Promise<void> {
    await this.closeReplicaConnection();
    await this.closePrimaryConnection();
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