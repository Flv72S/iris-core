/**
 * GET /messages/:id (HTTP Adapter)
 *
 * Responsabilità ESCLUSIVE:
 * - validare la shape dell'input (schema)
 * - estrarre messageId da req.params
 * - delegare a MessageReadProjection.getMessageById(id)
 * - mappare output -> response HTTP
 *
 * Vincoli:
 * - Nessuna logica di business nell'HTTP
 * - Nessun accesso a DB/fs/env
 * - Nessun try/catch
 * - Mapping esplicito: null -> 404
 */

import type { FastifyInstance } from 'fastify';
import type { MessageReadProjectionImpl } from '../../../core/projections/impl/MessageReadProjectionImpl';

type Params = {
  readonly id: string; // messageId
};

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

export function registerMessagesGetByIdRoutes(
  fastify: FastifyInstance,
  deps: { readonly projection: MessageReadProjectionImpl }
): void {
  fastify.get<{ Params: Params }>(
    '/messages/:id',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      const id = request.params.id;
      const message = await deps.projection.getMessageById(id);

      if (!message) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      return reply.code(200).send({
        id: message.id,
        threadId: message.threadId,
        author: message.author,
        content: message.content,
        createdAt: message.createdAt,
      });
    }
  );
}

