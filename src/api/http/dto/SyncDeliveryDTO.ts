/**
 * Sync / Delivery DTO
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
 * Message Delivery State enum (per DTO)
 */
export type MessageDeliveryStateDTO = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

/**
 * Response DTO per delivery messaggio
 */
export interface MessageDeliveryResponseDTO {
  readonly messageId: string;
  readonly threadId: string;
  readonly state: MessageDeliveryStateDTO;
  readonly sentAt: number;
  readonly deliveredAt?: number;
  readonly readAt?: number;
  readonly failedAt?: number;
  readonly failureReason?: string;
}

/**
 * Response DTO per sync status
 */
export interface SyncStatusResponseDTO {
  readonly isOnline: boolean;
  readonly lastSyncAt?: number;
  readonly pendingMessagesCount: number;
  readonly estimatedSyncLatency?: number;
}

/**
 * Request DTO per retry messaggio
 */
export interface MessageRetryRequestDTO {
  readonly threadId: string;
  readonly messageId: string;
  readonly reason?: string;
}

/**
 * Response DTO per retry messaggio
 */
export interface MessageRetryResponseDTO {
  readonly messageId: string;
  readonly threadId: string;
  readonly previousState: 'FAILED';
  readonly newState: 'SENT';
  readonly retriedAt: number;
  readonly retryCount: number;
}

/**
 * Error DTO per retry messaggio
 */
export interface MessageRetryErrorDTO {
  readonly code: string;
  readonly message: string;
  readonly messageId?: string;
  readonly threadId?: string;
  readonly currentRetryCount?: number;
}
