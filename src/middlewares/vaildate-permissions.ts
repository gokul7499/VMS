import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { checkPermission } from '../utility/check-permissions';
import generateCustomUUID from '../utility/genrateTraceId';
import logger from '../plugins/logger-plugin';


export function validatePermissions(action: string, permissions: string[]) {
  return function (request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply, done: HookHandlerDoneFunction): void {
    const token = request.headers.authorization;
    const { program_id } = request.params;

    if (!token || !program_id) {
      reply.status(401).send({
        status_code: 401,
        message: "Unauthorized: Missing token or program_id",
        trace_id: generateCustomUUID(),
      });
      return done();
    }

    logger.info('Validating permissions', permissions, action);

    checkPermission({ token, programId: program_id, requiredPermissions: { permissions }, action })
      .then(() => done()) // ✅ Call done() on success
      .catch((error) => {
        logger.error(error);
        reply.status(401).send({
          status_code: 401,
          message: error.message,
          trace_id: generateCustomUUID(),
        });
        done(); // ✅ Call done() on error as well
      });
  };
}