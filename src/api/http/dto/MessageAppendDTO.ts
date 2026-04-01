/**
 * Message Append DTO
 * 
 * DTO per HTTP layer - struttura esterna, separata da Core Types.
 * 
 * Vincoli:
 * - DTO ≠ Core Types
 * - DTO ≠ Repository Types
 * - DTO = struttura esterna validabile
 * - Nessun campo opzionale ambiguo
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.6_HTTP_Adapter_Map.md
 */

/**
 * Request DTO per append messaggio
 * 
 * Struttura esterna per HTTP input.
 */
export interface MessageAppendRequestDTO {
  readonly threadId: string;
  readonly senderAlias: string;
  readonly payload: string;
  readonly clientMessageId?: string;
}

/**
 * Response DTO per append messaggio
 * 
 * Struttura esterna per HTTP output.
 */
export interface MessageAppendResponseDTO {
  readonly messageId: string;
  readonly threadId: string;
  readonly state: 'SENT';
  readonly createdAt: number;
  readonly clientMessageId?: string;
}

/**
 * Error DTO per append messaggio
 * 
 * Struttura esterna per HTTP error output.
 */
export interface MessageAppendErrorDTO {
  readonly code: string;
  readonly message: string;
  readonly threadId?: string;
}
