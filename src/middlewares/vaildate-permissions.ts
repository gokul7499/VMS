import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { checkPermission } from '../utility/check-permissions';
import generateCustomUUID from '../utility/genrateTraceId';
import logger from '../plugins/logger-plugin';


export function validatePermissions(action: string, permissions: string[]) {
  return async function (request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply, done: HookHandlerDoneFunction) {
    const token = request.headers.authorization;
    const { program_id } = request.params;

    if (!token || !program_id) {
      return reply.status(401).send({
        status_code: 401,
        message: "Unauthorized: Missing token or program_id",
        trace_id: generateCustomUUID(),
      });
    }

    logger.info('Validating permissions', permissions, action);

    checkPermission({ token, programId: program_id, requiredPermissions: { permissions }, action })
      .then(() => done())
      .catch((error) => {
        logger.error(error);
        return reply.status(403).send({
          status_code: 403,
          message: error.message,
          error,
          trace_id: generateCustomUUID(),
        });
      });
  };
}