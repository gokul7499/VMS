import axios from "axios";
import Redis from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";

async function permissionsUtilAuth(fastify: any, opts: any) {
  const redis = new Redis(); // Initialize Redis client

  // Function to get policies
  async function getPolicies(programId: string, token: string) {
    if (!programId || !token) {
      throw new Error("Missing programId or token");
    }

    let groupPolicies = null;

    const redisKey = getRedisKeyForAuth(token, programId, null);

    try {
      // Fetch from Redis cache
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

    // If no policies in cache, fetch from external API
    if (!groupPolicies || groupPolicies.length === 0) {
      try {
        const apiResponse = await axios.get(
          `https://v4-dev.simplifysandbox.net/auth/v1/api/policy/user/tenant/${programId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`, // Pass the token in the API request
            },
            params: {
              programId,
            },
            timeout: 50000,
          }
        );

        // const apiResponse={
        //   "response":[
        //     {
        //       "permissions": {
        //         "srn": "srn:vms:config:configurations:pc",
        //         "policy": "DENY",
        //         "actions": ["V", "U"]
        //       },
        //       "type": "service",
        //       "visibility": false,
        //       "entityId": "e79bf0b4-7fd9-44f7-9e76-ec8850529139"
        //     },
        //     {
        //       "permissions": {
        //         "srn": "srn:vms:config:configurations:fc",
        //         "policy": "ALLOW",
        //         "actions": ["U", "C", "D", "V"]
        //       },
        //       "type": "service",
        //       "visibility": false,
        //       "entityId": "e79bf0b4-7fd9-44f7-9e76-ec8850529139"
        //     },
        //     {
        //       "permissions": {
        //         "srn": "srn:vms:config:configurations:ic",
        //         "policy": "ALLOW",
        //         "actions": ["V"]
        //       },
        //       "type": "service",
        //       "visibility": false,
        //       "entityId": "e79bf0b4-7fd9-44f7-9e76-ec8850529139"
        //     }
        //   ]
        // }

        groupPolicies = apiResponse.data.response; // Adjust based on actual API response structure

        // Set the policies in Redis cache
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
