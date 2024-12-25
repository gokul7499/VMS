import fastify, { FastifyRequest } from 'fastify';
import permissionsUtilAuth from './permissions-util'; // Assuming permissions utility is imported

export async function checkPermission(
  requiredPermissions: any, // Permissions passed from route config
  token: any,                 // Bearer token from request header
  programId: string             // Program ID from route params
): Promise<void> {
  try {
    if (!programId) {
      throw new Error('Missing program-id parameter');
    }

    if (!token || !token.startsWith('Bearer ')) {
      console.log("Unauthorized - Token not found");
      throw new Error("Unauthorized: Token not found or invalid"); // Throw error if token is missing or invalid
    }

    const tokenValue = token.split(' ')[1];

    // Fetch user policies using token and programId
    const { getPolicies } = await permissionsUtilAuth(fastify, {}); // Pass Fastify instance here
    const policies = await getPolicies(programId, tokenValue);

    if (!Array.isArray(policies)) {
      throw new Error('Invalid policies returned');
    }

    // Validate each required permission
    for (const permission of requiredPermissions.permissions) {
      await validatePermission(policies, permission);
    }
  } catch (error: any) {
    console.error(error.stack);
    // Throw an unauthorized error with a specific message
    throw new Error(`Unauthorized: You do not have permission to access this resource`);
  }
}

async function validatePermission(policies: any[], permission: string) {
  const resource = permission; // Adjust as necessary based on your policy structure
  const action = "*"; // You can adjust this based on the action needed

  const resourcePolicies = policies.filter((policy: any) =>
    matchesResource(policy.permissions.srn, resource)
  );

  if (!hasPermission(resourcePolicies, action)) {
    throw new Error('Unauthorized: You do not have permission to access this resource'); // Unauthorized error
  }
}

function hasPermission(policies: any[], action: string): boolean {
  let allow = false;
  for (const policy of policies) {
    const actions = policy.permissions.actions as string[];
    if (actions.includes('*') || actions.includes(action)) {
      if (policy.permissions.policy === 'DENY') {
        return false;
      } else {
        allow = true;
      }
    }
  }
  return allow;
}

function matchesResource(policySrn: string, resourceSrn: string): boolean {
  if (!policySrn) {
    return false;
  }

  if (policySrn === resourceSrn) {
    return true;
  }

  const policyParts = policySrn.split(':');
  const resourceParts = resourceSrn.split(':');

  if (policyParts.length <= resourceParts.length) {
    for (let i = 0; i < policyParts.length; i++) {
      if (policyParts[i] === '*') {
        return true;
      }
      if (policyParts[i] !== resourceParts[i]) {
        return false;
      }
    }
  } else {
    return policySrn.replace(':*', '') === resourceSrn;
  }

  return false;
}
