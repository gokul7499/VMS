import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { checkPermission } from '../utility/check-permissions';
import generateCustomUUID from '../utility/genrateTraceId';

interface Params {
  program_id: string;
}

// Pre-handler to check permissions (Fixed for SonarQube)
export function validatePermissions(
  request: FastifyRequest<{ Params: Params }>, 
  reply: FastifyReply, 
  done: HookHandlerDoneFunction
): void {
  const config = request.routeOptions.config ?? {};
  const { permissions = [], action = '' } = config as {
    permissions?: string[];
    action?: string;
  };

  const token = request.headers.authorization;
  const programId = request.params.program_id;

  if (!token) {
    reply.status(401).send({
      status_code: 401,
      message: "Unauthorized: Missing authorization token",
      trace_id: generateCustomUUID(),
    });
    return done();
  }

  if (!programId) {
    reply.status(401).send({
      status_code: 401,
      message: "Unauthorized: Missing program ID",
      trace_id: generateCustomUUID(),
    });
    return done();
  }

  // Handle async call correctly with callback-style handling
  checkPermission(token, programId, { permissions }, action)
    .then(() => done())  // Call `done()` on success
    .catch((error) => {
      reply.status(401).send({
        status_code: 401,
        message: "Unauthorized: Access denied",
        trace_id: generateCustomUUID(),
      });
      done(error);  // Pass the error to `done()` for proper handling
    });
}
