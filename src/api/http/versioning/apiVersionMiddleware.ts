/**
 * API Version Middleware — risoluzione versione prima del controller
 * Microstep 5.1.1 — equivalente NestJS Middleware/Interceptor
 *
 * La versione viene risolta e inserita in request.apiVersion.
 * I controller restano version-agnostic.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiVersionResolver } from './ApiVersionResolver';

const resolver = new ApiVersionResolver();

/**
 * Hook Fastify che risolve la versione API e la attacca al request.
 * Da registrare come preHandler o onRequest.
 */
export async function apiVersionMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const headers: Record<string, string | undefined> = {};
  if (request.headers) {
    for (const [k, v] of Object.entries(request.headers)) {
      headers[k] = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
    }
  }
  request.apiVersion = resolver.resolve({
    url: request.url,
    headers,
  });
}
