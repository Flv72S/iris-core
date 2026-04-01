/**
 * GET /threads/:id/messages (HTTP Adapter)
 *
 * Responsabilità ESCLUSIVE:
 * - validare la shape dell'input (schema)
 * - estrarre threadId da req.params
 * - delegare a MessageReadProjection (Read-Side Policy)
 * - mappare output -> response HTTP
 *
 * Vincoli:
 * - Nessuna logica di business nell'HTTP
 * - Nessun accesso a DB/fs/env
 * - Nessun try/catch
 * - Nessun sorting/paging/filtri
 */

import type { FastifyInstance } from 'fastify';
import type { MessageReadProjectionImpl } from '../../../core/projections/impl/MessageReadProjectionImpl';

type Params = {
  readonly id: string; // threadId
};

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

export function registerMessagesGetByThreadRoutes(
  fastify: FastifyInstance,
  deps: { readonly projection: MessageReadProjectionImpl }
): void {
  fastify.get<{ Params: Params }>(
    '/threads/:id/messages',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      const threadId = request.params.id;
      const messages = await deps.projection.findByThreadId(threadId);

      return reply.code(200).send({
        messages,
      });
    }
  );
}

