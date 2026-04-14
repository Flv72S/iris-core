/**
 * Error Mapping
 * 
 * Mappa errori dichiarativi del Boundary → HTTP status codes.
 * 
 * Vincoli:
 * - Nessun messaggio emozionale
 * - Nessuna traduzione semantica
 * - Mapping dichiarativo puro
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.6_HTTP_Adapter_Map.md
 * - src/api/core/types.ts (error codes)
 */

import type {
  MessageAppendError,
  ThreadStateError,
  MessageRetryError,
} from '../core/types';

/**
 * HTTP Status Code per errori dichiarativi
 */
export type HttpStatusCode = 400 | 404 | 409 | 429 | 500;

/**
 * Mappa errori MessageAppend → HTTP status
 */
export function mapMessageAppendError(error: MessageAppendError): HttpStatusCode {
  switch (error.code) {
    case 'THREAD_NOT_FOUND':
    case 'ALIAS_NOT_FOUND':
      return 404;
    case 'THREAD_CLOSED':
    case 'CLIENT_MESSAGE_ID_DUPLICATE':
      return 409;
    case 'PAYLOAD_INVALID':
    case 'PAYLOAD_TOO_LARGE':
      return 400;
    case 'RATE_LIMIT':
      return 429;
    case 'OFFLINE_QUEUE_FULL':
      return 500;
    default:
      return 500;
  }
}

/**
 * Mappa errori ThreadState → HTTP status
 */
export function mapThreadStateError(error: ThreadStateError): HttpStatusCode {
  switch (error.code) {
    case 'THREAD_NOT_FOUND':
      return 404;
    case 'INVALID_TRANSITION':
    case 'THREAD_ALREADY_ARCHIVED':
      return 409;
    case 'UNAUTHORIZED':
      return 400;
    default:
      return 500;
  }
}

/**
 * Mappa errori MessageRetry → HTTP status
 */
export function mapMessageRetryError(error: MessageRetryError): HttpStatusCode {
  switch (error.code) {
    case 'MESSAGE_NOT_FOUND':
      return 404;
    case 'MESSAGE_NOT_FAILED':
    case 'THREAD_CLOSED':
    case 'MAX_RETRIES_EXCEEDED':
      return 409;
    case 'UNAUTHORIZED':
      return 400;
    default:
      return 500;
  }
}

/**
 * Mappa errore generico → HTTP status
 * 
 * Fallback per errori non mappati esplicitamente.
 */
export function mapGenericError(_error: { code: string }): HttpStatusCode {
  // Errori non riconosciuti → 500
  return 500;
}
