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

  const { program_id } = request.params;

  if (!token) {
    reply.status(401).send({
      status_code: 401,
      message: "Unauthorized: Missing authorization token",
      trace_id: generateCustomUUID(),
    });
    return done();
  }

  if (!program_id) {
    reply.status(401).send({
      status_code: 401,
      message: "Unauthorized: Missing program ID",
      trace_id: generateCustomUUID(),
    });
    return done();
  }

  checkPermission(token, program_id, { permissions }, action)
    .then(() => done())
    .catch((error) => {
      console.error(error);
      reply.status(401).send({
        status_code: 401,
        message: error.message,
        trace_id: generateCustomUUID(),
      });
      done(error);
    });
}
