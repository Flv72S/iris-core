/**
 * GET /threads/:id (HTTP Adapter)
 *
 * Responsabilità ESCLUSIVE:
 * - validare solo la shape dell'input (schema Fastify)
 * - leggere dal repository (ThreadRepository.findById)
 * - mappare output -> response HTTP
 *
 * Vincoli:
 * - Nessuna logica di business / decisioni applicative
 * - Nessun sorting/paging/filtri/trasformazioni semantiche
 * - Nessun accesso a DB/fs/env/HTTP esterno
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ThreadRepository } from '../../../core/threads/ThreadRepository';
import { InMemoryThreadRepository } from '../repositories/InMemoryThreadRepository';

const threadIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

export function registerThreadGetByIdRoutes(
  fastify: FastifyInstance,
  deps?: { readonly repo?: ThreadRepository }
): void {
  const repo = deps?.repo ?? new InMemoryThreadRepository();

  fastify.get<{ Params: { id: string } }>(
    '/threads/:id',
    {
      schema: {
        params: threadIdParamsSchema,
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = request.params.id;
      const thread = await repo.findById(id);

      if (!thread) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: 'Not Found' });
      }

      return reply.code(200).send({
        id: thread.getId(),
        title: thread.getTitle(),
        createdAt: thread.getCreatedAt().toISOString(),
        updatedAt: thread.getUpdatedAt().toISOString(),
        archived: thread.isArchived(),
      });
    }
  );
}

