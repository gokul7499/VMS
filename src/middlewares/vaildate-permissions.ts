import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { checkPermission } from '../utility/check-permissions';
import generateCustomUUID from '../utility/genrateTraceId';

export function validatePermissions(request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply, done: HookHandlerDoneFunction): void {
  const config = request.routeOptions?.config || {};
  const { permissions = [], action = '' } = config as {
    permissions?: string[];
    action?: string;
  };

  const token = request.headers.authorization;

  // Retrieve `program_id` from request parameters
  const { program_id } = request.params;

  // Handle missing authorization token
  if (!token) {
    reply.status(401).send({
      status_code: 401,
      message: "Unauthorized: Missing authorization token",
      trace_id: generateCustomUUID(),
    });
    return done();
  }

  // Handle missing program_id
  if (!program_id) {
    reply.status(401).send({
      status_code: 401,
      message: "Unauthorized: Missing program ID",
      trace_id: generateCustomUUID(),
    });
    return done();
  }

  // Check permissions using the `checkPermission` function
  checkPermission(token, program_id, { permissions }, action)
    .then(() => done())  // Permission check passed
    .catch((error) => {
      // Handle permission check failure
      reply.status(401).send({
        status_code: 401,
        message: "Unauthorized: Access denied",
        trace_id: generateCustomUUID(),
      });
      done(error);
    });
}

