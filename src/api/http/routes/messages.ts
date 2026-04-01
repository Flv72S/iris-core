/**
 * Messages Routes
 * 
 * Route HTTP per Message Append.
 * 
 * Responsabilità ESCLUSIVE:
 * 1. Leggere input HTTP
 * 2. Validare schema DTO
 * 3. Chiamare MessagingBoundary.appendMessage(...)
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
  MessageAppendRequestDTO,
  MessageAppendResponseDTO,
  MessageAppendErrorDTO,
} from '../dto/MessageAppendDTO';
import {
  mapMessageAppendError,
  type HttpStatusCode,
} from '../errorMapping';
import type {
  MessageAppendRequest,
  MessageAppendResponse,
  MessageAppendError,
} from '../../core/types';

/**
 * Schema validazione DTO per append message
 */
const messageAppendRequestSchema = {
  type: 'object',
  required: ['threadId', 'senderAlias', 'payload'],
  properties: {
    threadId: { type: 'string', minLength: 1 },
    senderAlias: { type: 'string', minLength: 1 },
    payload: { type: 'string', minLength: 1 },
    clientMessageId: { type: 'string' },
  },
};

/**
 * Converte DTO → Core Request
 */
function dtoToCoreRequest(dto: MessageAppendRequestDTO): MessageAppendRequest {
  return {
    threadId: dto.threadId,
    senderAlias: dto.senderAlias,
    payload: dto.payload,
    clientMessageId: dto.clientMessageId,
  };
}

/**
 * Converte Core Response → DTO
 */
function coreResponseToDto(response: MessageAppendResponse): MessageAppendResponseDTO {
  return {
    messageId: response.messageId,
    threadId: response.threadId,
    state: response.state,
    createdAt: response.createdAt,
    clientMessageId: response.clientMessageId,
  };
}

/**
 * Converte Core Error → DTO
 */
function coreErrorToDto(error: MessageAppendError): MessageAppendErrorDTO {
  return {
    code: error.code,
    message: error.message,
    threadId: error.threadId,
  };
}

/**
 * Registra route per append message
 */
export function registerMessageRoutes(
  fastify: FastifyInstance,
  boundary: MessagingBoundary
): void {
  /**
   * POST /threads/:threadId/messages
   * 
   * Append messaggio a thread.
   */
  fastify.post<{
    Params: { threadId: string };
    Body: MessageAppendRequestDTO;
  }>(
    '/threads/:threadId/messages',
    {
      schema: {
        params: {
          type: 'object',
          required: ['threadId'],
          properties: {
            threadId: { type: 'string', minLength: 1 },
          },
        },
        body: messageAppendRequestSchema,
      },
    },
    async (
      request: FastifyRequest<{ Params: { threadId: string }; Body: MessageAppendRequestDTO }>,
      reply: FastifyReply
    ) => {
      // 1. Leggere input HTTP
      const dto: MessageAppendRequestDTO = {
        ...request.body,
        threadId: request.params.threadId, // threadId dal path
      };

      // 2. Validazione schema DTO (gestita da Fastify schema)
      // Se la validazione fallisce, Fastify risponde automaticamente con 400

      // 3. Chiamare MessagingBoundary.appendMessage(...)
      const coreRequest = dtoToCoreRequest(dto);
      const isOnline = true; // TODO: derivare da header o middleware se necessario
      const result = await boundary.appendMessage(coreRequest, isOnline);

      // 4. Mappare risposta in HTTP response
      if ('messageId' in result) {
        // Success
        const responseDto = coreResponseToDto(result as MessageAppendResponse);
        return reply.code(201).send(responseDto);
      } else {
        // Error
        const errorDto = coreErrorToDto(result as MessageAppendError);
        const statusCode: HttpStatusCode = mapMessageAppendError(result as MessageAppendError);
        return reply.code(statusCode).send(errorDto);
      }
    }
  );
}
