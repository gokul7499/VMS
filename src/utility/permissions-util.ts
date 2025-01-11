import axios from "axios";
import Redis from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";

async function permissionsUtilAuth(fastify: any, opts: any) {
  const redis = new Redis();

  async function getPolicies(programId: string, token: string) {
    if (!programId || !token) {
      throw new Error("Missing programId or token");
    }

    let groupPolicies = null;

    const redisKey = getRedisKeyForAuth(token, programId, null);

    try {
      const cachedPolicies = await redis.get(redisKey);
      if (cachedPolicies) {
        groupPolicies = JSON.parse(cachedPolicies);
        if (fastify.log) {
          fastify.log.info(
            `Fetched the policies from cache for ${token}/${programId}`
          );
        }
      }
    } catch (err) {
      if (fastify.log) {
        fastify.log.error(`Error fetching from Redis: ${err}`);
      }
    }

    if (!groupPolicies || groupPolicies.length === 0) {
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
        await redis.set(redisKey, JSON.stringify(groupPolicies));

        if (fastify.log) {
          fastify.log.info(
            `Fetched policies from API for ${token}-${programId}`
          );
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
  return {
    getPolicies,
  };
}

export default permissionsUtilAuth;
