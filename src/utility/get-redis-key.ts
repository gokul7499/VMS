export function getRedisKeyForAuth(token: string, programId: string, otherParam: string | null) {
    // Create a Redis key based on the token and programId
    let key = `auth:${token}:${programId}`;

    // Optionally append other parameters to the Redis key if provided
    if (otherParam) {
        key += `:${otherParam}`;
    }

    return key;
}
