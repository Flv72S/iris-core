/**
 * POST /threads/:id/messages (HTTP Adapter)
 *
 * Responsabilità ESCLUSIVE:
 * - validare la shape dell'input (schema)
 * - estrarre threadId da req.params
 * - delegare a CreateMessage (Core use case)
 * - mappare output -> response HTTP
 *
 * Vincoli:
 * - Nessuna logica di business nell'HTTP
 * - Nessun accesso a DB/fs/env
 * - Nessun try/catch
 */

import type { FastifyInstance } from 'fastify';
import { CreateMessage } from '../../../core/messages/usecases/CreateMessage';
import type { MessageRepository } from '../../../core/messages/MessageRepository';
import { InMemoryMessageRepository } from '../repositories/InMemoryMessageRepository';

type Params = {
  readonly id: string; // threadId
};

type Body = {
  readonly author: string;
  readonly content: string;
};

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

// Shape-only: strings required. We also require at least one non-whitespace char to avoid Core invariant errors
// without introducing adapter-level error mapping logic (try/catch is forbidden here).
const bodySchema = {
  type: 'object',
  required: ['author', 'content'],
  properties: {
    author: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
    content: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
  },
};

export function registerThreadMessageCreateRoutes(
  fastify: FastifyInstance,
  deps?: { readonly repo?: MessageRepository }
): void {
  const repo = deps?.repo ?? new InMemoryMessageRepository();
  const useCase = new CreateMessage(repo);

  fastify.post<{ Params: Params; Body: Body }>(
    '/threads/:id/messages',
    {
      schema: {
        params: paramsSchema,
        body: bodySchema,
      },
    },
    async (request, reply) => {
      const threadId = request.params.id;
      const { author, content } = request.body;

      const message = await useCase.execute({ threadId, author, content });

      return reply.code(201).send({
        id: message.id,
        threadId: message.threadId,
        author: message.author,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      });
    }
  );
}

