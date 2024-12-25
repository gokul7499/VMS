// fastify.d.ts
import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    getPolicies(programId: string, token: string): Promise<any>;
  }
}
