import { FastifyRequest, FastifyReply } from 'fastify';
import { checkPermission } from '../utility/check-permissions';
import generateCustomUUID from '../utility/genrateTraceId';

interface Params {
  program_id: string;
}

// Pre-handler to check permissions
export async function permissionCheck(
  request: FastifyRequest<{ Params: Params }>, // Explicitly define Params type here
  reply: FastifyReply,
  done: () => void
) {
  const { permissions, action } = request.routeOptions.config as unknown as {
    permissions: string[];
    action: string;
  };
  const token = request.headers.authorization; // Authorization token
  const programId = request.params.program_id; // Program ID from route params

  try {
    // Check permissions before proceeding
    await checkPermission(token, programId, { permissions }, action);
    done(); // If permissions check passes, proceed to the next handler (createCity)
  } catch (error) {
    return reply.status(401).send({
      status_code: 401,
      message: "Unauthorized",
      trace_id: generateCustomUUID(),
    });
  }
}
