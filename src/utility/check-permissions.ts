import fastify from "fastify";
import permissionsUtilAuth from "./permissions-util";

function validateInputs(token: string, programId: string): void {
  if (!programId) {
    throw new Error('Missing program-id parameter');
  }
  if (!token?.startsWith('Bearer ')) {
    throw new Error("Unauthorized: Token not found or invalid");
  }
}

export async function checkPermission(
  token: any,
  programId: string,
  requiredPermissions: { permissions: string[] },
  action: string,
): Promise<void> {
  try {
    validateInputs(token, programId);
    const tokenValue = token.split(' ')[1];
    const { getPolicies } = await permissionsUtilAuth(fastify, {});
    const policies = await getPolicies(programId, tokenValue);

    if (!Array.isArray(policies)) {
      throw new Error('Invalid policies returned');
    }

    const permissionArray = Array.isArray(requiredPermissions.permissions) ? requiredPermissions.permissions : [requiredPermissions.permissions];

    for (const permission of permissionArray) {
      validatePermissions(policies, [permission], action);
    }
  } catch (error: any) {
    console.error(error.stack);
    throw new Error(`Unauthorized: You do not have permission to access this resource`);
  }
}

function matchesResource(resource: string, permissionResource: string): boolean {
  if (!resource || !permissionResource) return false;

  // Full wildcard match
  if (permissionResource === "*" || permissionResource === "srn:*") {
      return true;
  }

  // Split for segment comparison
  const resourceParts = resource.split(':');
  const permissionParts = permissionResource.split(':');

  // Check each segment for a match or wildcard
  for (let i = 0; i < permissionParts.length; i++) {
      if (permissionParts[i] === '*') return true; // Wildcard match
      if (permissionParts[i] !== resourceParts[i]) return false;
  }

  // Ensure no extra segments in resource
  return permissionParts.length <= resourceParts.length;
}

function validatePermissions(policies: any[], requiredPermissions: string[], action?: string): void {
  let hasValidPermission = false;

  for (const requiredPermission of requiredPermissions) {
      const matchingPolicies = policies.filter(policy =>
          matchesResource(requiredPermission, policy.permissions.srn)
      );

      if (matchingPolicies.length === 0) {
          console.log(`No matching policies for permission: ${requiredPermission}`);
          continue;
      }

      const allowed = matchingPolicies.some(policy =>
          policy.permissions.policy === "ALLOW" &&
          (policy.permissions.actions.includes("*") || policy.permissions.actions.includes(action))
      );

      const denied = matchingPolicies.some(policy =>
          policy.permissions.policy === "DENY" &&
          (policy.permissions.actions.includes("*") || policy.permissions.actions.includes(action))
      );

      if (denied) {
          throw new Error(`Unauthorized: Action explicitly denied for ${requiredPermission}`);
      }

      if (allowed) {
          hasValidPermission = true;
      }
  }

  if (!hasValidPermission) {
      throw new Error('Unauthorized: No valid permissions found.');
  }
}
