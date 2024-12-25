import axios from "axios";
import Redis from "ioredis";
import { getRedisKeyForAuth } from "./get-redis-key";

async function permissionsUtilAuth(fastify: any, opts: any) {
  const redis = new Redis(); // Initialize Redis client

  // Function to get policies
  async function getPolicies(programId: string, token: string) {
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
          `http://ssp-devnlb.simplifysandbox.net:9091/auth/v1/api/policy/user/tenant/${programId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`, // Pass the token in the API request
            },
            params: {
              programId,
            },
            timeout: 50000, // Add timeout to avoid hanging indefinitely
          }
        );
        //   const apiResponse={
        //     "message": "Successfully fetched all user policies for the tenant",
        //     "response": [
        //         {
        //             "permissions": {
        //                 "srn": "srn:createCity",
        //                 "policy": "ALLOW",
        //                 "actions": [
        //                     "*"
        //                 ]
        //             },
        //             "type": "service",
        //             "visibility": false,
        //             "entityId": "49efd9c4-b822-4770-9143-8275f86672be"
        //         }
        //     ]
        //  }

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
