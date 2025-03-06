import type { FastifyInstance } from 'fastify';
import Swagger from '@fastify/swagger';
import SwaggerUi from '@fastify/swagger-ui';

const configSwagger = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Config API',
      description: 'API documentation for Sourcing API',
      version: '1.0.0',
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http' as const,
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
};

const configSwaggerUi = {
  routePrefix: '/config/docs',
  uiConfig: {
    docExpansion: 'list' as 'list' | 'full' | 'none',
    deepLinking: false,
  },
  uiHooks: {
    onRequest: (request: any, reply: any, next: any) => next(),
    preHandler: (request: any, reply: any, next: any) => next(),
  },
  staticCSP: true,
  transformStaticCSP: (header: any) => header,
  exposeRoute: true,
};

export default async function LoadSwagger(instance: FastifyInstance) {
  await instance.register(Swagger, configSwagger);
  await instance.register(SwaggerUi, configSwaggerUi);
}