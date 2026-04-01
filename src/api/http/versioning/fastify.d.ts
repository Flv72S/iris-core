/**
 * Fastify request augmentation — request.apiVersion
 */
import type { ApiVersion } from './ApiVersion';

declare module 'fastify' {
  interface FastifyRequest {
    apiVersion?: ApiVersion;
  }
}
