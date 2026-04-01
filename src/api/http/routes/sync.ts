/**
 * Sync Routes
 * 
 * Route HTTP per Sync / Delivery.
 * 
 * Responsabilità ESCLUSIVE:
 * 1. Leggere input HTTP
 * 2. Validare schema DTO
 * 3. Chiamare MessagingBoundary.getMessageDelivery(...) / retryMessage(...) / getSyncStatus(...)
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
  MessageDeliveryResponseDTO,
  MessageRetryRequestDTO,
  MessageRetryResponseDTO,
  MessageRetryErrorDTO,
  SyncStatusResponseDTO,
} from '../dto/SyncDeliveryDTO';
import {
  mapMessageRetryError,
  type HttpStatusCode,
} from '../errorMapping';
import type {
  MessageDeliveryResponse,
  MessageRetryRequest,
  MessageRetryResponse,
  MessageRetryError,
  SyncStatusResponse,
} from '../../core/types';

/**
 * Schema validazione DTO per retry message
 * 
 * Nota: messageId e threadId vengono dai params, non dal body.
 * Il body contiene solo reason (opzionale).
 */
const messageRetryRequestSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', maxLength: 500 },
  },
};

/**
 * Converte Core Response → DTO (Message Delivery)
 */
function coreDeliveryResponseToDto(
  response: MessageDeliveryResponse
): MessageDeliveryResponseDTO {
  return {
    messageId: response.messageId,
    threadId: response.threadId,
    state: response.state,
    sentAt: response.sentAt,
    deliveredAt: response.deliveredAt,
    readAt: response.readAt,
    failedAt: response.failedAt,
    failureReason: response.failureReason,
  };
}

/**
 * Converte DTO → Core Request (Message Retry)
 */
function dtoToCoreRequest(dto: MessageRetryRequestDTO): MessageRetryRequest {
  return {
    threadId: dto.threadId,
    messageId: dto.messageId,
    reason: dto.reason,
  };
}

/**
 * Converte Core Response → DTO (Message Retry)
 */
function coreRetryResponseToDto(response: MessageRetryResponse): MessageRetryResponseDTO {
  return {
    messageId: response.messageId,
    threadId: response.threadId,
    previousState: response.previousState,
    newState: response.newState,
    retriedAt: response.retriedAt,
    retryCount: response.retryCount,
  };
}

/**
 * Converte Core Error → DTO (Message Retry)
 */
function coreErrorToDto(error: MessageRetryError): MessageRetryErrorDTO {
  return {
    code: error.code,
    message: error.message,
    messageId: error.messageId,
    threadId: error.threadId,
    currentRetryCount: error.currentRetryCount,
  };
}

/**
 * Converte Core Response → DTO (Sync Status)
 */
function coreSyncStatusResponseToDto(response: SyncStatusResponse): SyncStatusResponseDTO {
  return {
    isOnline: response.isOnline,
    lastSyncAt: response.lastSyncAt,
    pendingMessagesCount: response.pendingMessagesCount,
    estimatedSyncLatency: response.estimatedSyncLatency,
  };
}

/**
 * Registra route per sync / delivery
 */
export function registerSyncRoutes(
  fastify: FastifyInstance,
  boundary: MessagingBoundary
): void {
  /**
   * GET /threads/:threadId/messages/:messageId/delivery
   * 
   * Ottiene delivery messaggio.
   */
  fastify.get<{
    Params: { threadId: string; messageId: string };
  }>(
    '/threads/:threadId/messages/:messageId/delivery',
    {
      schema: {
        params: {
          type: 'object',
          required: ['threadId', 'messageId'],
          properties: {
            threadId: { type: 'string', minLength: 1 },
            messageId: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { threadId: string; messageId: string } }>,
      reply: FastifyReply
    ) => {
      // 1. Leggere input HTTP
      const { threadId, messageId } = request.params;

      // 2. Validazione schema DTO (gestita da Fastify schema)

      // 3. Chiamare MessagingBoundary.getMessageDelivery(...)
      const result = await boundary.getMessageDelivery(messageId, threadId);

      // 4. Mappare risposta in HTTP response
      if ('state' in result && 'sentAt' in result) {
        // Success
        const responseDto = coreDeliveryResponseToDto(result as MessageDeliveryResponse);
        return reply.code(200).send(responseDto);
      } else {
        // Error (MessageRetryError per getMessageDelivery)
        const errorDto = coreErrorToDto(result as MessageRetryError);
        const statusCode: HttpStatusCode = mapMessageRetryError(result as MessageRetryError);
        return reply.code(statusCode).send(errorDto);
      }
    }
  );

  /**
   * POST /threads/:threadId/messages/:messageId/retry
   * 
   * Retry messaggio.
   */
  fastify.post<{
    Params: { threadId: string; messageId: string };
    Body: Omit<MessageRetryRequestDTO, 'threadId' | 'messageId'>;
  }>(
    '/threads/:threadId/messages/:messageId/retry',
    {
      schema: {
        params: {
          type: 'object',
          required: ['threadId', 'messageId'],
          properties: {
            threadId: { type: 'string', minLength: 1 },
            messageId: { type: 'string', minLength: 1 },
          },
        },
        body: messageRetryRequestSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: { threadId: string; messageId: string };
        Body: Omit<MessageRetryRequestDTO, 'threadId' | 'messageId'>;
      }>,
      reply: FastifyReply
    ) => {
      // 1. Leggere input HTTP
      const dto: MessageRetryRequestDTO = {
        ...request.body,
        threadId: request.params.threadId,
        messageId: request.params.messageId,
      };

      // 2. Validazione schema DTO (gestita da Fastify schema)

      // 3. Chiamare MessagingBoundary.retryMessage(...)
      const coreRequest = dtoToCoreRequest(dto);
      const result = await boundary.retryMessage(coreRequest);

      // 4. Mappare risposta in HTTP response
      if ('previousState' in result && 'newState' in result) {
        // Success
        const responseDto = coreRetryResponseToDto(result as MessageRetryResponse);
        return reply.code(200).send(responseDto);
      } else {
        // Error
        const errorDto = coreErrorToDto(result as MessageRetryError);
        const statusCode: HttpStatusCode = mapMessageRetryError(result as MessageRetryError);
        return reply.code(statusCode).send(errorDto);
      }
    }
  );

  /**
   * GET /sync/status
   * 
   * Ottiene sync status.
   */
  fastify.get<{
    Querystring: { isOnline?: string };
  }>(
    '/sync/status',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            isOnline: { type: 'string', enum: ['true', 'false'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { isOnline?: string } }>,
      reply: FastifyReply
    ) => {
      // 1. Leggere input HTTP
      const isOnline = request.query.isOnline === 'true' || request.query.isOnline === undefined;

      // 2. Validazione schema DTO (gestita da Fastify schema)

      // 3. Chiamare MessagingBoundary.getSyncStatus(...)
      const result = await boundary.getSyncStatus(isOnline);

      // 4. Mappare risposta in HTTP response
      const responseDto = coreSyncStatusResponseToDto(result);
      return reply.code(200).send(responseDto);
    }
  );
}
