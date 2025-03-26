import fastify from "fastify";
import permissionsUtilAuth from "./permissions-util";
import logger from '../plugins/logger-plugin';

interface Permission {
  srn: string;
  policy: "ALLOW" | "DENY";
  actions: string[];
}

interface Policy {
  permissions: Permission;
  [key: string]: any;
}

interface RequiredPermissions {
  token: string;
  programId: string;
  requiredPermissions: { permissions: string | string[] };
  action: string;
}
class PermissionError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Validates the input parameters
 * @throws {PermissionError} If inputs are invalid
 */
function validateInputs(token: string, programId: string): void {
  if (!programId?.trim()) {
    throw new PermissionError('Missing program-id parameter', 400);
  }

  if (!token || typeof token !== 'string') {
    throw new PermissionError("Unauthorized: Token not found", 401);
  }

  if (!token.startsWith('Bearer ')) {
    throw new PermissionError("Unauthorized: Invalid token format", 401);
  }
}

function matchesResource(resource: string, permissionResource: string): boolean {
  if (!resource || !permissionResource) return false;

  if (permissionResource === "*" || permissionResource === "srn:*") {
    return true;
  }

  const resourceParts = resource.split(':');
  const permissionParts = permissionResource.split(':');

  if (permissionParts.length > resourceParts.length) {
    return false;
  }

  for (let i = 0; i < permissionParts.length; i++) {
    if (permissionParts[i] === '*') return true;
    if (permissionParts[i] !== resourceParts[i]) return false;
  }

  return true;
}

/**
 * Checks if a policy's action matches the required action
 */
function policyActionMatches(policy: Policy, action?: string): boolean {
  return !action ||
    policy.permissions.actions.includes("*") ||
    policy.permissions.actions.includes(action);
}

/**
 * Gets cached resource match result or computes and caches it
 */
function getCachedResourceMatch(
  requiredPermission: string,
  permissionSrn: string,
  resourceMatchCache: Map<string, Map<string, boolean>>
): boolean {
  if (!resourceMatchCache.has(requiredPermission)) {
    resourceMatchCache.set(requiredPermission, new Map());
  }

  const permissionCache = resourceMatchCache.get(requiredPermission)!;

  if (permissionCache.has(permissionSrn)) {
    return permissionCache.get(permissionSrn)!;
  } else {
    const resourceMatches = matchesResource(requiredPermission, permissionSrn);
    permissionCache.set(permissionSrn, resourceMatches);
    return resourceMatches;
  }
}

/**
 * Processes a single policy against a required permission
 */
function processSinglePolicy(
  policy: Policy,
  requiredPermission: string,
  action: string | undefined,
  resourceMatchCache: Map<string, Map<string, boolean>>,
  permissionStatus: { allowed: boolean, denied: boolean, deniedReason: string }
): boolean {
  // Skip policies without permissions
  if (!policy.permissions?.srn) return false;

  // Check if resource matches using cache
  const resourceMatches = getCachedResourceMatch(
    requiredPermission,
    policy.permissions.srn,
    resourceMatchCache
  );

  if (!resourceMatches) return false;

  // Check actions
  const actionMatches = policyActionMatches(policy, action);
  if (!actionMatches) return false;

  // Check policy type
  if (policy.permissions.policy === "DENY") {
    permissionStatus.denied = true;
    permissionStatus.deniedReason = `Action '${action}' explicitly denied for ${requiredPermission}`;
    return true; // Found a deny match
  } else if (policy.permissions.policy === "ALLOW") {
    permissionStatus.allowed = true;
  }

  return false; // No deny match
}

/**
 * Validates permissions against policies
 * @throws {PermissionError} If permissions are denied or not found
 */
function validatePermissions(policies: Policy[], requiredPermissions: string[], action?: string): void {
  // Initialize permission status
  const permissionStatus = {
    allowed: false,
    denied: false,
    deniedReason: ''
  };

  // Cache for resource matching results to avoid redundant calculations
  const resourceMatchCache = new Map<string, Map<string, boolean>>();

  // Check each required permission
  for (const requiredPermission of requiredPermissions) {
    // Skip empty permissions
    if (!requiredPermission) continue;

    let matchingPoliciesFound = false;

    // Check against all policies
    for (const policy of policies) {
      const foundDenyMatch = processSinglePolicy(
        policy,
        requiredPermission,
        action,
        resourceMatchCache,
        permissionStatus
      );

      if (foundDenyMatch) break;

      // If we got this far and didn't continue, we found a matching policy
      matchingPoliciesFound = true;
    }

    // If explicit deny found, break early
    if (permissionStatus.denied) break;

    // Log if no matching policies found for this permission
    if (!matchingPoliciesFound) {
      logger.debug(`No matching policies for permission: ${requiredPermission}`);
    }
  }

  // Check final permission status
  if (permissionStatus.denied) {
    throw new PermissionError(`Unauthorized: ${permissionStatus.deniedReason}`);
  }

  if (!permissionStatus.allowed) {
    throw new PermissionError('Unauthorized: No valid permissions found');
  }
}

// Singleton for caching the permission util
let permissionUtil: any = null;

/**
 * Checks if the user has the required permissions
 * @param params Permission check parameters
 * @throws {PermissionError} If permissions are denied
 */
export async function checkPermission(params: RequiredPermissions): Promise<void> {
  try {
    const { token, programId, requiredPermissions, action } = params;
    validateInputs(token, programId);

    // Extract token value
    const tokenValue = token.split(' ')[1];

    // Initialize permission util if needed (lazy loading)
    if (!permissionUtil) {
      permissionUtil = await permissionsUtilAuth(fastify, {});
    }

    // Get policies
    const policies = await permissionUtil.getPolicies(programId, tokenValue);

    // Validate policies
    if (!Array.isArray(policies)) {
      throw new PermissionError('Invalid policies returned', 500);
    }

    logger.debug(`✅ Fetched ${policies.length} policies for programId: ${programId}`);

    // Normalize permission array
    const permissionArray = Array.isArray(requiredPermissions.permissions)
      ? requiredPermissions.permissions
      : [requiredPermissions.permissions];

    // Validate permissions
    validatePermissions(policies, permissionArray, action);

    // Log successful permission check
    logger.debug(`Permission check passed for ${action} on programId: ${programId}`);
  } catch (error: unknown) {
    // Handle errors
    if (error instanceof PermissionError) {
      logger.warn(`Permission check failed: ${error.message}`);
      throw error; // Re-throw permission errors
    } else {
      // Log unexpected errors
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Unexpected error during permission check: ${message}`);
      if (error instanceof Error && error.stack) {
        logger.error(error.stack);
      }

      // Generic error for security
      throw new PermissionError('Unauthorized: You do not have permission to access this resource');
    }
  }
}

export { PermissionError };