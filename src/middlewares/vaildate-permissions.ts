import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { checkPermission } from '../utility/check-permissions';
import generateCustomUUID from '../utility/genrateTraceId';
import logger from '../plugins/logger-plugin';


export function validatePermissions(action: string, permissions: string[]) {
  return function (request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply, done: HookHandlerDoneFunction): void {
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

    logger.info('Validating permissions', permissions, action);

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
  };
}