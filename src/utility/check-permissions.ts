import fastify from "fastify";
import permissionsUtilAuth from "./permissions-util";

// Validate input parameters
function validateInputs(token: string, programId: string): void {
  if (!programId) {
    throw new Error('Missing program-id parameter');
  }
  if (!token?.startsWith('Bearer ')) {
    throw new Error("Unauthorized: Token not found or invalid");
}

}

// Function to check permission
export async function checkPermission(
  token: any, 
  programId: string,
  requiredPermissions: { permissions: string[] }, 
  action: string, // Action to check (e.g., "V", "U", "C", etc.)
): Promise<void> {
  try {
    validateInputs(token, programId);

    const tokenValue = token.split(' ')[1]; // Extract the token
    const { getPolicies } = await permissionsUtilAuth(fastify, {});
    const policies = await getPolicies(programId, tokenValue);

    // Log the fetched policies for debugging
    console.log("Fetched policies:", JSON.stringify(policies, null, 2));

    if (!Array.isArray(policies)) {
      throw new Error('Invalid policies returned');
    }

    // Ensure requiredPermissions.permissions is an array
    const permissionArray = Array.isArray(requiredPermissions.permissions) ? requiredPermissions.permissions : [requiredPermissions.permissions];

    // Check each required permission
    for (const permission of permissionArray) {
      console.log("Validating permission:", permission);
      validatePermissions(policies, [permission], action); // Pass the permission to validate
    }
  } catch (error: any) {
    console.error(error.stack);
    throw new Error(`Unauthorized: You do not have permission to access this resource`);
  }
}

// Function to match resources
function matchesResource(resource: string, permissionResource: string): boolean {
  if (!resource || !permissionResource) return false;

  const resourceParts = resource.split(':');
  const permissionParts = permissionResource.split(':');

  console.log("Matching resource:", resource, "with permission resource:", permissionResource);

  if (permissionParts.length <= resourceParts.length) {
    for (let i = 0; i < permissionParts.length; i++) {
      if (permissionParts[i] === '*') return true;
      if (permissionParts[i] !== resourceParts[i]) return false;
    }
    return true;
  }

  return permissionResource.replace(':*', '') === resource;
}

// Function to check if a policy has the required permission for an action
function hasPermission(policies: any[], action?: string): boolean {
  let allow = false;

  policies.forEach(policy => {
    const { policy: policyType, actions } = policy.permissions;
    console.log("Checking policy:", policyType, actions);

    if (policyType === 'ALLOW' && (actions.includes('*') || actions.includes(action))) {
      allow = true;
    } else if (policyType === 'DENY' && actions.includes(action)) {
      allow = false;
      return false;
    }
  });

  return allow;
}

function validatePermissions(policies: any[], requiredPermissions: string[], action?: string): void {
  let hasValidPermission = false;

  for (const requiredPermission of requiredPermissions) {
      console.log(`Checking required permission: ${requiredPermission}`);
      
      // Filter policies for the required permission
      const resourcePolicies = policies.filter(policy =>
          matchesResource(policy.permissions.srn, requiredPermission)
      );

      console.log(`Filtered policies for ${requiredPermission}:`, resourcePolicies);

      // If no matching policy exists, continue checking other permissions
      if (resourcePolicies.length === 0) {
          console.log(`No matching policies for permission: ${requiredPermission}`);
          continue;
      }

      // Check if the action is allowed for the matching policies
      const allowedActions = resourcePolicies.some(policy => 
          policy.permissions.policy === "ALLOW" && 
          (policy.permissions.actions.includes("*") || policy.permissions.actions.includes(action))
      );

      console.log(`Allowed actions for permission ${requiredPermission}:`, allowedActions);

      // If any policy allows the action, mark as valid
      if (allowedActions) {
          hasValidPermission = true;
      }

      // If any policy explicitly denies the action, deny it immediately
      const deniedActions = resourcePolicies.some(policy => 
          policy.permissions.policy === "DENY" && policy.permissions.actions.includes(action)
      );
      
      if (deniedActions) {
          console.log(`Action "${action}" explicitly denied for permission: ${requiredPermission}`);
          throw new Error('Unauthorized: Action explicitly denied for the resource.');
      }
  }

  // If none of the permissions allowed the action
  if (!hasValidPermission) {
      console.log('No valid permissions found for the action.');
      throw new Error('Unauthorized: User does not have permission for any provided resources.');
  }
}





