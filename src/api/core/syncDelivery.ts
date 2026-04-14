/**
 * Sync / Delivery Core Logic
 * 
 * Implementazione contract-driven per Sync/Delivery.
 * 
 * Vincoli:
 * - 100% contract-driven
 * - Deterministicamente testabile
 * - Privo di side-effect impliciti
 * - Coerente con invarianti SYS-05, SYS-07, SYS-08
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md §3
 * - IRIS_API_Invariants_and_Failure_Modes.md
 */

import type {
  MessageDeliveryState,
  MessageDeliveryResponse,
  MessageRetryRequest,
  MessageRetryResponse,
  MessageRetryError,
  SyncStatusResponse,
  InternalMessage,
} from './types';
import {
  roundTimestamp,
  validateOfflineQueue,
} from './invariants';

// ============================================================================
// TIPI PER REPOSITORY (astrazione per persistenza)
// ============================================================================

/**
 * Repository per messaggi (astrazione)
 * 
 * Nota: L'implementazione concreta sarà fornita a livello di integrazione.
 */
export interface MessageRepository {
  get(messageId: string, threadId: string): Promise<InternalMessage | null>;
  updateDeliveryState(
    messageId: string,
    threadId: string,
    state: MessageDeliveryState,
    timestamp: number,
    failureReason?: string
  ): Promise<void>;
  updateRetryCount(messageId: string, threadId: string, retryCount: number): Promise<void>;
}

/**
 * Repository per thread (astrazione)
 */
export interface ThreadRepository {
  getState(threadId: string): Promise<'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED' | null>;
}

/**
 * Repository per coda offline (astrazione)
 */
export interface OfflineQueueRepository {
  getSize(): Promise<number>;
  getPendingMessages(): Promise<InternalMessage[]>;
}

/**
 * Repository per sync status (astrazione)
 */
export interface SyncStatusRepository {
  getLastSyncAt(): Promise<number | null>;
  getEstimatedLatency(): Promise<number | null>;
}

// ============================================================================
// COSTANTI
// ============================================================================

const MAX_RETRY_COUNT = 5;
const RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000]; // 1s, 2s, 4s, 8s, 16s
const MAX_RETRY_DELAY_MS = 60000; // 60s

// ============================================================================
// FUNZIONI CORE
// ============================================================================

/**
 * Ottiene stato delivery messaggio.
 * 
 * Vincoli (Invarianti SYS-04, SYS-05):
 * - Stato delivery esplicito (non inferito)
 * - Timestamp arrotondati
 */
export async function getMessageDelivery(
  messageId: string,
  threadId: string,
  messageRepo: MessageRepository
): Promise<MessageDeliveryResponse | MessageRetryError> {
  // Ottiene messaggio
  const message = await messageRepo.get(messageId, threadId);
  if (!message) {
    return {
      code: 'MESSAGE_NOT_FOUND',
      message: 'Il messaggio non è stato trovato.',
      messageId,
      threadId,
    };
  }

  // Mappa stato interno a stato delivery
  let deliveryState: MessageDeliveryState;
  let deliveredAt: number | undefined;
  let readAt: number | undefined;
  let failedAt: number | undefined;
  let failureReason: string | undefined;

  switch (message.state) {
    case 'SENT':
      deliveryState = 'SENT';
      break;
    case 'DELIVERED':
      deliveryState = 'DELIVERED';
      deliveredAt = message.createdAt; // Assumiamo deliveredAt = createdAt per semplicità
      break;
    case 'READ':
      deliveryState = 'READ';
      deliveredAt = message.createdAt;
      readAt = message.createdAt; // Assumiamo readAt = createdAt per semplicità
      break;
    case 'FAILED':
      deliveryState = 'FAILED';
      failedAt = message.createdAt;
      failureReason = 'Consegna fallita.';
      break;
    default:
      deliveryState = 'SENT';
  }

  // Restituisce response
  return {
    messageId: message.messageId,
    threadId: message.threadId,
    state: deliveryState,
    sentAt: message.createdAt,
    deliveredAt,
    readAt,
    failedAt,
    failureReason,
  };
}

/**
 * Esegue retry messaggio.
 * 
 * Vincoli:
 * - Retry solo per messaggi FAILED
 * - Max 5 tentativi
 * - Retry policy esponenziale backoff
 * - Nessun retry automatico invisibile
 */
export async function retryMessage(
  request: MessageRetryRequest,
  messageRepo: MessageRepository,
  threadRepo: ThreadRepository
): Promise<MessageRetryResponse | MessageRetryError> {
  // Ottiene messaggio
  const message = await messageRepo.get(request.messageId, request.threadId);
  if (!message) {
    return {
      code: 'MESSAGE_NOT_FOUND',
      message: 'Il messaggio non è stato trovato.',
      messageId: request.messageId,
      threadId: request.threadId,
    };
  }

  // Verifica che messaggio sia in stato FAILED
  if (message.state !== 'FAILED') {
    return {
      code: 'MESSAGE_NOT_FAILED',
      message: 'Il messaggio non è in stato FAILED. Solo i messaggi falliti possono essere ritentati.',
      messageId: request.messageId,
      threadId: request.threadId,
    };
  }

  // Verifica retry count (max 5)
  const currentRetryCount = message.retryCount ?? 0;
  if (currentRetryCount >= MAX_RETRY_COUNT) {
    return {
      code: 'MAX_RETRIES_EXCEEDED',
      message: `Numero massimo di tentativi raggiunto: ${MAX_RETRY_COUNT}`,
      messageId: request.messageId,
      threadId: request.threadId,
      currentRetryCount,
    };
  }

  // Verifica che thread non sia chiuso
  const threadState = await threadRepo.getState(request.threadId);
  if (threadState === 'CLOSED' || threadState === 'ARCHIVED') {
    return {
      code: 'THREAD_CLOSED',
      message: 'Il thread è chiuso. Non è possibile ritentare il messaggio.',
      messageId: request.messageId,
      threadId: request.threadId,
    };
  }

  // Calcola nuovo retry count
  const newRetryCount = currentRetryCount + 1;

  // Calcola timestamp retry (arrotondato)
  const now = Date.now();
  const retriedAt = roundTimestamp(now); // Invariante SYS-05

  // Aggiorna messaggio (stato SENT, retry count incrementato)
  await messageRepo.updateDeliveryState(request.messageId, request.threadId, 'SENT', retriedAt);
  await messageRepo.updateRetryCount(request.messageId, request.threadId, newRetryCount);

  // Restituisce response
  return {
    messageId: request.messageId,
    threadId: request.threadId,
    previousState: 'FAILED',
    newState: 'SENT',
    retriedAt,
    retryCount: newRetryCount,
  };
}

/**
 * Ottiene sync status.
 * 
 * Vincoli (Invarianti SYS-07, SYS-08):
 * - isOnline esplicito (non inferito)
 * - lastSyncAt esplicito (non derivato)
 * - pendingMessagesCount esplicito (non derivato)
 * - estimatedSyncLatency esplicito (non inferito)
 * - Nessun realtime implicito
 */
export async function getSyncStatus(
  isOnline: boolean,
  repositories: {
    syncStatusRepo: SyncStatusRepository;
    offlineQueueRepo: OfflineQueueRepository;
  }
): Promise<SyncStatusResponse> {
  // Ottiene lastSyncAt (se disponibile)
  const lastSyncAt = await repositories.syncStatusRepo.getLastSyncAt();
  const lastSyncAtRounded = lastSyncAt ? roundTimestamp(lastSyncAt) : undefined;

  // Ottiene pending messages count
  const pendingMessages = await repositories.offlineQueueRepo.getPendingMessages();
  const pendingMessagesCount = pendingMessages.length;

  // Ottiene estimated latency (se disponibile)
  const estimatedSyncLatency = await repositories.syncStatusRepo.getEstimatedLatency();

  // Restituisce response
  return {
    isOnline, // Esplicito, non inferito
    lastSyncAt: lastSyncAtRounded, // Esplicito, non derivato
    pendingMessagesCount, // Esplicito, non derivato
    estimatedSyncLatency: estimatedSyncLatency ?? undefined,
  };
}

/**
 * Calcola delay retry basato su retry count (esponenziale backoff).
 * 
 * Vincoli:
 * - Retry policy: 1s, 2s, 4s, 8s, 16s, max 60s
 */
export function calculateRetryDelay(retryCount: number): number {
  if (retryCount <= 0 || retryCount > MAX_RETRY_COUNT) {
    return MAX_RETRY_DELAY_MS;
  }

  const delay = RETRY_BACKOFF_MS[retryCount - 1] ?? MAX_RETRY_DELAY_MS;
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}
