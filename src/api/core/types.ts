/**
 * Core API Types
 * 
 * Tipi definiti dai contratti API congelati (STEP 5.3).
 * Questi tipi sono READ-ONLY e non possono essere modificati.
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 */

// ============================================================================
// CONTRATTO 1: Message Append
// ============================================================================

/**
 * Request per append messaggio
 * 
 * Vincoli (Invariante SYS-02, SYS-03):
 * - threadId obbligatorio (Thread-First)
 * - senderAlias obbligatorio (Alias-Only)
 * - payload obbligatorio, max 10MB, non vuoto
 */
export interface MessageAppendRequest {
  readonly threadId: string;
  readonly senderAlias: string;
  readonly payload: string;
  readonly clientMessageId?: string;
}

/**
 * Response per append messaggio
 * 
 * Vincoli (Invariante SYS-01, SYS-04, SYS-05):
 * - messageId immutabile (Append-Only)
 * - state letterale 'SENT' (Stato Esplicito)
 * - createdAt arrotondato bucket 5s (Timestamp Arrotondato)
 */
export interface MessageAppendResponse {
  readonly messageId: string;
  readonly threadId: string;
  readonly state: 'SENT';
  readonly createdAt: number;
  readonly clientMessageId?: string;
}

/**
 * Errori per append messaggio
 * 
 * Vincoli (Invariante SYS-09):
 * - Codice errore standardizzato (enum)
 * - Messaggio dichiarativo, non emozionale
 */
export type MessageAppendErrorCode =
  | 'THREAD_NOT_FOUND'
  | 'THREAD_CLOSED'
  | 'ALIAS_NOT_FOUND'
  | 'PAYLOAD_INVALID'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMIT'
  | 'OFFLINE_QUEUE_FULL'
  | 'CLIENT_MESSAGE_ID_DUPLICATE';

export interface MessageAppendError {
  readonly code: MessageAppendErrorCode;
  readonly message: string;
  readonly threadId?: string;
}

// ============================================================================
// CONTRATTO 2: Thread State
// ============================================================================

/**
 * Thread State enum (chiuso, finito)
 * 
 * Vincoli (Invariante SYS-04):
 * - Solo 4 stati ammessi
 * - Nessun altro stato possibile
 */
export type ThreadState = 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

/**
 * Response per stato thread
 * 
 * Vincoli (Invariante SYS-04, SYS-05):
 * - state enum chiuso, finito
 * - lastStateChangeAt arrotondato bucket 5s
 * - canAcceptMessages derivato esplicito (state === 'OPEN')
 */
export interface ThreadStateResponse {
  readonly threadId: string;
  readonly state: ThreadState;
  readonly lastStateChangeAt: number;
  readonly canAcceptMessages: boolean;
}

/**
 * Request per transizione stato thread
 * 
 * Vincoli:
 * - Solo transizioni forward (PAUSED, CLOSED, ARCHIVED)
 * - reason opzionale, max 500 caratteri
 */
export interface ThreadStateTransitionRequest {
  readonly threadId: string;
  readonly targetState: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  readonly reason?: string;
}

/**
 * Response per transizione stato thread
 * 
 * Vincoli (Invariante SYS-05):
 * - transitionedAt arrotondato bucket 5s
 */
export interface ThreadStateTransitionResponse {
  readonly threadId: string;
  readonly previousState: 'OPEN' | 'PAUSED' | 'CLOSED';
  readonly newState: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  readonly transitionedAt: number;
}

/**
 * Errori per thread state
 */
export type ThreadStateErrorCode =
  | 'THREAD_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'UNAUTHORIZED'
  | 'THREAD_ALREADY_ARCHIVED';

export interface ThreadStateError {
  readonly code: ThreadStateErrorCode;
  readonly message: string;
  readonly threadId?: string;
  readonly currentState?: ThreadState;
  readonly requestedState?: 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
}

// ============================================================================
// CONTRATTO 3: Sync / Delivery
// ============================================================================

/**
 * Message Delivery State enum
 * 
 * Vincoli (Invariante SYS-04):
 * - Stato esplicito, non inferito
 */
export type MessageDeliveryState = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

/**
 * Response per delivery messaggio
 * 
 * Vincoli (Invariante SYS-05):
 * - Tutti i timestamp arrotondati bucket 5s
 * - failureReason max 500 caratteri
 */
export interface MessageDeliveryResponse {
  readonly messageId: string;
  readonly threadId: string;
  readonly state: MessageDeliveryState;
  readonly sentAt: number;
  readonly deliveredAt?: number;
  readonly readAt?: number;
  readonly failedAt?: number;
  readonly failureReason?: string;
}

/**
 * Response per sync status
 * 
 * Vincoli (Invariante SYS-07, SYS-08):
 * - isOnline esplicito (non inferito)
 * - lastSyncAt esplicito (non derivato)
 * - pendingMessagesCount esplicito (non derivato)
 * - estimatedSyncLatency esplicito (non inferito)
 */
export interface SyncStatusResponse {
  readonly isOnline: boolean;
  readonly lastSyncAt?: number;
  readonly pendingMessagesCount: number;
  readonly estimatedSyncLatency?: number;
}

/**
 * Request per retry messaggio
 * 
 * Vincoli:
 * - Retry solo per messaggi FAILED
 * - Max 5 tentativi
 */
export interface MessageRetryRequest {
  readonly threadId: string;
  readonly messageId: string;
  readonly reason?: string;
}

/**
 * Response per retry messaggio
 * 
 * Vincoli (Invariante SYS-05):
 * - retriedAt arrotondato bucket 5s
 * - retryCount esplicito (max 5)
 */
export interface MessageRetryResponse {
  readonly messageId: string;
  readonly threadId: string;
  readonly previousState: 'FAILED';
  readonly newState: 'SENT';
  readonly retriedAt: number;
  readonly retryCount: number;
}

/**
 * Errori per retry messaggio
 */
export type MessageRetryErrorCode =
  | 'MESSAGE_NOT_FOUND'
  | 'MESSAGE_NOT_FAILED'
  | 'MAX_RETRIES_EXCEEDED'
  | 'THREAD_CLOSED'
  | 'UNAUTHORIZED';

export interface MessageRetryError {
  readonly code: MessageRetryErrorCode;
  readonly message: string;
  readonly messageId?: string;
  readonly threadId?: string;
  readonly currentRetryCount?: number;
}

// ============================================================================
// TIPI INTERNI (non esposti nei contratti)
// ============================================================================

/**
 * Messaggio interno (per logica core)
 * 
 * Vincoli (Invariante SYS-01, SYS-02, SYS-03, SYS-04, SYS-05):
 * - Tutti i campi readonly (immutabili dopo creazione)
 * - threadId obbligatorio (Thread-First)
 * - senderAlias obbligatorio (Alias-Only)
 * - state obbligatorio (Stato Esplicito)
 * - createdAt arrotondato (Timestamp Arrotondato)
 */
export interface InternalMessage {
  readonly messageId: string;
  readonly threadId: string;
  readonly senderAlias: string;
  readonly payload: string;
  readonly state: 'DRAFT' | 'SENT' | 'DELIVERED' | 'READ' | 'ARCHIVED' | 'EXPIRED' | 'FAILED' | 'CANCELLED';
  readonly createdAt: number;
  readonly clientMessageId?: string;
  readonly retryCount?: number;
}

/**
 * Thread interno (per logica core)
 * 
 * Vincoli (Invariante SYS-04, SYS-05):
 * - state enum chiuso, finito
 * - lastStateChangeAt arrotondato
 */
export interface InternalThread {
  readonly threadId: string;
  readonly state: ThreadState;
  readonly lastStateChangeAt: number;
}
