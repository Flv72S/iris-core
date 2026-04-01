/**
 * POST /threads (HTTP Adapter)
 *
 * Responsabilità ESCLUSIVE:
 * - validare la shape dell'input (schema)
 * - delegare a CreateThread (Core use case)
 * - mappare output -> response HTTP
 *
 * Vincoli:
 * - Nessuna logica di business nell'HTTP
 * - Nessun accesso a DB/fs/env
 * - Errori dal Core -> HTTP 400 (propagazione con mapping status)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateThread } from '../../../core/threads/usecases/CreateThread';
import type { ThreadRepository } from '../../../core/threads/ThreadRepository';
import { InMemoryThreadRepository } from '../repositories/InMemoryThreadRepository';

type CreateThreadRequestBody = {
  readonly id: string;
  readonly title: string;
};

const createThreadRequestSchema = {
  type: 'object',
  required: ['id', 'title'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
  },
};

export function registerThreadCreateRoutes(
  fastify: FastifyInstance,
  deps?: { readonly repo?: ThreadRepository }
): void {
  const repo = deps?.repo ?? new InMemoryThreadRepository();
  const useCase = new CreateThread(repo);

  fastify.post<{ Body: CreateThreadRequestBody }>(
    '/threads',
    {
      schema: {
        body: createThreadRequestSchema,
      },
    },
    async (request: FastifyRequest<{ Body: CreateThreadRequestBody }>, reply: FastifyReply) => {
      // Shape validation: handled by Fastify schema (400 on failure)
      const { title } = request.body;

      try {
        const thread = await useCase.execute({ title });

        return reply.code(201).send({
          id: thread.getId(),
          title: thread.getTitle(),
          createdAt: thread.getCreatedAt().toISOString(),
          updatedAt: thread.getUpdatedAt().toISOString(),
          archived: thread.isArchived(),
        });
      } catch (_err) {
        // Core invariant violations must map to 400 for this adapter.
        // No semantic transformation beyond status code + generic message.
        return reply.code(400).send({ code: 'BAD_REQUEST', message: 'Bad Request' });
      }
    }
  );
}

