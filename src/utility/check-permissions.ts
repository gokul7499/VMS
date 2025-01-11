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

  const resourceParts = resource.split(':');
  const permissionParts = permissionResource.split(':');

  if (permissionParts.length <= resourceParts.length) {
    for (let i = 0; i < permissionParts.length; i++) {
      if (permissionParts[i] === '*') return true;
      if (permissionParts[i] !== resourceParts[i]) return false;
    }
    return true;
  }

  return permissionResource.replace(':*', '') === resource;
}

function validatePermissions(policies: any[], requiredPermissions: string[], action?: string): void {
  let hasValidPermission = false;

  for (const requiredPermission of requiredPermissions) {
    const resourcePolicies = policies.filter(policy =>
      matchesResource(policy.permissions.srn, requiredPermission)
    );

    if (resourcePolicies.length === 0) {
      console.log(`No matching policies for permission: ${requiredPermission}`);
      continue;
    }

    const allowedActions = resourcePolicies.some(policy =>
      policy.permissions.policy === "ALLOW" &&
      (policy.permissions.actions.includes("*") || policy.permissions.actions.includes(action))
    );

    if (allowedActions) {
      hasValidPermission = true;
    }

    const deniedActions = resourcePolicies.some(policy =>
      policy.permissions.policy === "DENY" && policy.permissions.actions.includes(action)
    );

    if (deniedActions) {
      console.log(`Action "${action}" explicitly denied for permission: ${requiredPermission}`);
      throw new Error('Unauthorized: Action explicitly denied for the resource.');
    }
  }

  if (!hasValidPermission) {
    console.log('No valid permissions found for the action.');
    throw new Error('Unauthorized: User does not have permission for any provided resources.');
  }
}
