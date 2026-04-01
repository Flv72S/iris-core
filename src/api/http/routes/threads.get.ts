/**
 * GET /threads (HTTP Adapter)
 *
 * Responsabilità ESCLUSIVE:
 * - delegare a ThreadReadProjection (Read-Side Policy)
 * - serializzare read models -> response HTTP
 *
 * Vincoli:
 * - Nessuna logica applicativa/business nell'HTTP
 * - Nessun sorting/paging/filtri/trasformazioni semantiche
 * - Nessun try/catch (propagazione diretta)
 * - Nessun accesso a DB/fs/env
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ThreadReadProjectionImpl } from '../../../core/projections/impl/ThreadReadProjectionImpl';

export function registerThreadListRoutes(
  fastify: FastifyInstance,
  deps: { readonly projection: ThreadReadProjectionImpl }
): void {
  fastify.get(
    '/threads',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const threads = await deps.projection.findAll();

      return reply.code(200).send({
        threads,
      });
    }
  );
}

