/**
 * Threads Routes
 * 
 * Route HTTP per Thread State.
 * 
 * Responsabilità ESCLUSIVE:
 * 1. Leggere input HTTP
 * 2. Validare schema DTO
 * 3. Chiamare MessagingBoundary.getThreadState(...) / transitionThreadState(...)
 * 4. Mappare risposta in HTTP response
 * 
 * Vincoli:
 * - Nessuna semantica
 * - Nessuna decisione
 * - Nessun accesso diretto al Core
 * - Nessuna persistenza diretta
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.6_HTTP_Adapter_Map.md
 * - src/api/boundary/MessagingBoundary.ts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { MessagingBoundary } from '../../boundary/MessagingBoundary';
import type {
  ThreadStateResponseDTO,
  ThreadStateTransitionRequestDTO,
  ThreadStateTransitionResponseDTO,
  ThreadStateErrorDTO,
} from '../dto/ThreadStateDTO';
import {
  mapThreadStateError,
  type HttpStatusCode,
} from '../errorMapping';
import type {
  ThreadStateResponse,
  ThreadStateTransitionRequest,
  ThreadStateTransitionResponse,
  ThreadStateError,
} from '../../core/types';

/**
 * Schema validazione DTO per transition thread state
 */
const threadStateTransitionRequestSchema = {
  type: 'object',
  required: ['targetState'],
  properties: {
    targetState: {
      type: 'string',
      enum: ['PAUSED', 'CLOSED', 'ARCHIVED'],
    },
    reason: { type: 'string', maxLength: 500 },
  },
};

/**
 * Converte Core Response → DTO (Thread State)
 */
function coreResponseToDto(response: ThreadStateResponse): ThreadStateResponseDTO {
  return {
    threadId: response.threadId,
    state: response.state,
    lastStateChangeAt: response.lastStateChangeAt,
    canAcceptMessages: response.canAcceptMessages,
  };
}

/**
 * Converte DTO → Core Request (Thread State Transition)
 */
function dtoToCoreRequest(dto: ThreadStateTransitionRequestDTO): ThreadStateTransitionRequest {
  return {
    threadId: dto.threadId,
    targetState: dto.targetState,
    reason: dto.reason,
  };
}

/**
 * Converte Core Response → DTO (Thread State Transition)
 */
function coreTransitionResponseToDto(
  response: ThreadStateTransitionResponse
): ThreadStateTransitionResponseDTO {
  return {
    threadId: response.threadId,
    previousState: response.previousState,
    newState: response.newState,
    transitionedAt: response.transitionedAt,
  };
}

/**
 * Converte Core Error → DTO (Thread State)
 */
function coreErrorToDto(error: ThreadStateError): ThreadStateErrorDTO {
  return {
    code: error.code,
    message: error.message,
    threadId: error.threadId,
    currentState: error.currentState,
    requestedState: error.requestedState,
  };
}

/**
 * Registra route per thread state
 */
export function registerThreadRoutes(
  fastify: FastifyInstance,
  boundary: MessagingBoundary
): void {
  /**
   * GET /threads/:threadId/state
   * 
   * Ottiene stato thread.
   */
  fastify.get<{
    Params: { threadId: string };
  }>(
    '/threads/:threadId/state',
    {
      schema: {
        params: {
          type: 'object',
          required: ['threadId'],
          properties: {
            threadId: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { threadId: string } }>,
      reply: FastifyReply
    ) => {
      // 1. Leggere input HTTP
      const threadId = request.params.threadId;

      // 2. Validazione schema DTO (gestita da Fastify schema)

      // 3. Chiamare MessagingBoundary.getThreadState(...)
      const result = await boundary.getThreadState(threadId);

      // 4. Mappare risposta in HTTP response
      if ('state' in result && 'canAcceptMessages' in result) {
        // Success
        const responseDto = coreResponseToDto(result as ThreadStateResponse);
        return reply.code(200).send(responseDto);
      } else {
        // Error
        const errorDto = coreErrorToDto(result as ThreadStateError);
        const statusCode: HttpStatusCode = mapThreadStateError(result as ThreadStateError);
        return reply.code(statusCode).send(errorDto);
      }
    }
  );

  /**
   * PATCH /threads/:threadId/state
   * 
   * Transizione stato thread.
   */
  fastify.patch<{
    Params: { threadId: string };
    Body: Omit<ThreadStateTransitionRequestDTO, 'threadId'>;
  }>(
    '/threads/:threadId/state',
    {
      schema: {
        params: {
          type: 'object',
          required: ['threadId'],
          properties: {
            threadId: { type: 'string', minLength: 1 },
          },
        },
        body: threadStateTransitionRequestSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: { threadId: string };
        Body: Omit<ThreadStateTransitionRequestDTO, 'threadId'>;
      }>,
      reply: FastifyReply
    ) => {
      // 1. Leggere input HTTP
      const dto: ThreadStateTransitionRequestDTO = {
        ...request.body,
        threadId: request.params.threadId, // threadId dal path
      };

      // 2. Validazione schema DTO (gestita da Fastify schema)

      // 3. Chiamare MessagingBoundary.transitionThreadState(...)
      const coreRequest = dtoToCoreRequest(dto);
      const result = await boundary.transitionThreadState(coreRequest);

      // 4. Mappare risposta in HTTP response
      if ('previousState' in result && 'newState' in result) {
        // Success
        const responseDto = coreTransitionResponseToDto(result as ThreadStateTransitionResponse);
        return reply.code(200).send(responseDto);
      } else {
        // Error
        const errorDto = coreErrorToDto(result as ThreadStateError);
        const statusCode: HttpStatusCode = mapThreadStateError(result as ThreadStateError);
        return reply.code(statusCode).send(errorDto);
      }
    }
  );
}
