/**
 * Error Handler Centralizzato
 * 
 * Gestione centralizzata degli errori con logging strutturato.
 * 
 * Responsabilità ESCLUSIVE:
 * - Mappare errori a risposte HTTP
 * - Loggare errori in formato strutturato
 * - Applicare error visibility policy
 * - Nessuna logica applicativa
 * - Nessuna semantica
 * 
 * Vincoli:
 * - Errori dichiarativi, non emozionali
 * - Ogni errore loggato con errorCode, correlationId, source, visibility
 * - Nessun stacktrace al client
 * - Nessun messaggio ambiguo
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9A_Observability_Map.md
 * - IRIS_STEP5.9A_Error_Visibility_Policy.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-07, H-19)
 */

import type { LogComponent } from './logger';
import { getLogger } from './logger';

/**
 * Error Visibility
 */
export type ErrorVisibility = 'INTERNAL' | 'CLIENT';

/**
 * Error Source
 */
export type ErrorSource = 'http' | 'boundary' | 'repository' | 'core' | 'unknown';

/**
 * Structured Error
 */
export interface StructuredError {
  readonly errorCode: string;
  readonly message: string;
  readonly source: ErrorSource;
  readonly visibility: ErrorVisibility;
  readonly correlationId: string;
  readonly component: LogComponent;
  readonly context?: Record<string, unknown>;
  readonly originalError?: Error;
}

/**
 * HTTP Error Response
 */
export interface HttpErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly correlationId: string;
}

/**
 * Mappa errore a risposta HTTP
 */
export function mapErrorToHttpResponse(error: StructuredError): HttpErrorResponse {
  // Solo errori CLIENT visibili al client
  if (error.visibility === 'CLIENT') {
    return {
      code: error.errorCode,
      message: error.message,
      correlationId: error.correlationId,
    };
  }

  // Errori INTERNAL → messaggio generico
  return {
    code: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
    correlationId: error.correlationId,
  };
}

/**
 * Mappa errore a HTTP status code
 */
export function mapErrorToHttpStatus(error: StructuredError): number {
  // Errori dichiarativi dal Boundary hanno già status code
  // Errori runtime → 500
  if (error.source === 'boundary' || error.source === 'core') {
    // Usa errorCode per determinare status (se possibile)
    // Altrimenti default 500
    return 500;
  }

  return 500;
}

/**
 * Gestisce errore e logga
 */
export function handleError(
  error: unknown,
  correlationId: string,
  component: LogComponent,
  source: ErrorSource = 'unknown',
  context?: Record<string, unknown>
): StructuredError {
  // Estrae informazioni dall'errore
  let errorCode = 'UNKNOWN_ERROR';
  let message = 'An unknown error occurred';
  let originalError: Error | undefined;

  if (error instanceof Error) {
    originalError = error;
    message = error.message;
    errorCode = error.name || 'UNKNOWN_ERROR';
  } else if (typeof error === 'string') {
    message = error;
    errorCode = 'STRING_ERROR';
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    errorCode = (errObj.code as string) || (errObj.errorCode as string) || 'UNKNOWN_ERROR';
    message = (errObj.message as string) || 'An error occurred';
  }

  // Determina visibility (default: INTERNAL)
  const visibility: ErrorVisibility = 'INTERNAL';

  const structuredError: StructuredError = {
    errorCode,
    message,
    source,
    visibility,
    correlationId,
    component,
    context,
    originalError,
  };

  // Logga errore strutturato
  const logger = getLogger();
  logger.error(component, correlationId, message, {
    errorCode,
    source,
    visibility,
    ...context,
    ...(originalError && { errorName: originalError.name, errorStack: originalError.stack }),
  });

  return structuredError;
}

/**
 * Gestisce errore HTTP e restituisce risposta
 */
export function handleHttpError(
  error: unknown,
  correlationId: string,
  component: LogComponent = 'http',
  source: ErrorSource = 'http',
  context?: Record<string, unknown>
): { statusCode: number; response: HttpErrorResponse } {
  const structuredError = handleError(error, correlationId, component, source, context);
  const statusCode = mapErrorToHttpStatus(structuredError);
  const response = mapErrorToHttpResponse(structuredError);

  return { statusCode, response };
}
