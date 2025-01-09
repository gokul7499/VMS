import fastify from "fastify";
import permissionsUtilAuth from "./permissions-util";

export async function checkPermission(
  requiredPermissions: any, 
  token: any, 
  programId: string,
  action?: string, // Action to check (e.g., "V", "U", "C", etc.)
): Promise<void> {
  try {
    // Validate input parameters
    function validateInputs(token: string, programId: string): void {
      if (!programId) {
        throw new Error('Missing program-id parameter');
      }
      if (!token || !token.startsWith('Bearer ')) {
        throw new Error("Unauthorized: Token not found or invalid");
      }
    }
    validateInputs(token, programId);

    const tokenValue = token.split(' ')[1]; // Extract the token
    const { getPolicies } = await permissionsUtilAuth(fastify, {});
    const policies = await getPolicies(programId, tokenValue);

    // Log the fetched policies for debugging
    console.log("Fetched policies:", JSON.stringify(policies, null, 2));

    if (!Array.isArray(policies)) {
      throw new Error('Invalid policies returned');
    }

    // Check each required permission
    for (const permission of requiredPermissions.permissions) {
      console.log("Validating permission:", permission);
      validatePermission(policies, permission, action); // Pass the action to validate
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

// This function checks both the resource and the action
function validatePermission(policies: any[], requiredPermission: string, action?: string): void {
  console.log("Checking required permission against policies:", requiredPermission);

  let isDenied = false;
  let isAllowed = false;

  policies.forEach((policy) => {
    const { srn, policy: policyType, actions } = policy.permissions;
    console.log("Checking policy:", srn, policyType, actions);

    // Check if the current policy matches the required permission (resource)
    const resourceMatch = matchesResource(requiredPermission, srn);
    console.log(resourceMatch, "KKKKK");

    if (resourceMatch) {
      if (policyType === "DENY") {
        // If the action matches or is undefined, deny access
        if (!action || actions.includes(action)) {
          isDenied = true;
          console.log(`Access denied for resource ${requiredPermission} with action ${action}`);
        }
      } else if (policyType === "ALLOW") {
        // If the action matches or is undefined, allow access
        if (!action || actions.includes(action)) {
          isAllowed = true;
        }
      }
    }
  });

  if (isDenied) {
    throw new Error('Unauthorized: Access is explicitly denied for this resource or action');
  }
  console.log(isAllowed,"MMMMM")
  if (!isAllowed) {
    throw new Error('Unauthorized: No valid policy found for the resource or action');
  }
}
