/**
 * Message Append Core Logic
 * 
 * Implementazione contract-driven per Message Append.
 * 
 * Vincoli:
 * - 100% contract-driven
 * - Deterministicamente testabile
 * - Privo di side-effect impliciti
 * - Coerente con invarianti SYS-01, SYS-02, SYS-03, SYS-04, SYS-05
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md §1
 * - IRIS_API_Invariants_and_Failure_Modes.md
 */

// UUID generation (compatibile con browser e Node.js)
function randomUUID(): string {
  // Fallback per browser (crypto.randomUUID non sempre disponibile)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback manuale
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import type {
  MessageAppendRequest,
  MessageAppendResponse,
  MessageAppendError,
  InternalMessage,
} from './types';
import {
  validateThreadFirst,
  validateAliasOnly,
  validatePayload,
  roundTimestamp,
  createExplicitError,
} from './invariants';

// ============================================================================
// TIPI PER REPOSITORY (astrazione per persistenza)
// ============================================================================

/**
 * Repository per thread (astrazione)
 * 
 * Nota: L'implementazione concreta sarà fornita a livello di integrazione.
 * Questo core non accede direttamente a storage o network.
 */
export interface ThreadRepository {
  exists(threadId: string): Promise<boolean>;
  getState(threadId: string): Promise<'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED' | null>;
}

/**
 * Repository per alias (astrazione)
 * 
 * Nota: L'implementazione concreta sarà fornita a livello di integrazione.
 */
export interface AliasRepository {
  exists(aliasId: string): Promise<boolean>;
  isRootIdentity(aliasId: string): Promise<boolean>;
}

/**
 * Repository per messaggi (astrazione)
 * 
 * Nota: L'implementazione concreta sarà fornita a livello di integrazione.
 */
export interface MessageRepository {
  findByClientMessageId(clientMessageId: string): Promise<InternalMessage | null>;
  create(message: InternalMessage): Promise<void>;
}

/**
 * Repository per rate limiting (astrazione)
 * 
 * Nota: L'implementazione concreta sarà fornita a livello di integrazione.
 */
export interface RateLimitRepository {
  checkLimit(senderAlias: string, windowMs: number, maxRequests: number): Promise<boolean>;
}

/**
 * Repository per coda offline (astrazione)
 * 
 * Nota: L'implementazione concreta sarà fornita a livello di integrazione.
 */
export interface OfflineQueueRepository {
  getSize(): Promise<number>;
}

// ============================================================================
// FUNZIONI CORE
// ============================================================================

/**
 * Valida request Message Append.
 * 
 * Vincoli (Invarianti SYS-02, SYS-03):
 * - threadId obbligatorio (Thread-First)
 * - senderAlias obbligatorio (Alias-Only)
 * - payload valido (non vuoto, max 10MB, UTF-8)
 */
export async function validateMessageAppendRequest(
  request: MessageAppendRequest,
  threadRepo: ThreadRepository,
  aliasRepo: AliasRepository
): Promise<MessageAppendError | null> {
  // Validazione thread-first (SYS-02)
  validateThreadFirst(request);

  // Validazione alias-only (SYS-03)
  validateAliasOnly(request);

  // Validazione payload
  const payloadError = validatePayload(request.payload);
  if (payloadError) {
    return payloadError;
  }

  // Verifica esistenza thread
  const threadExists = await threadRepo.exists(request.threadId);
  if (!threadExists) {
    return createExplicitError('THREAD_NOT_FOUND', 'Il thread non è stato trovato.', request.threadId);
  }

  // Verifica stato thread (deve essere OPEN)
  const threadState = await threadRepo.getState(request.threadId);
  if (threadState === null) {
    return createExplicitError('THREAD_NOT_FOUND', 'Il thread non è stato trovato.', request.threadId);
  }
  if (threadState === 'CLOSED' || threadState === 'ARCHIVED') {
    return createExplicitError('THREAD_CLOSED', 'Il thread è chiuso. Non è possibile aggiungere messaggi.', request.threadId);
  }

  // Verifica esistenza alias
  const aliasExists = await aliasRepo.exists(request.senderAlias);
  if (!aliasExists) {
    return createExplicitError('ALIAS_NOT_FOUND', 'L\'alias non è stato trovato.');
  }

  // Verifica che alias non sia root identity
  const isRoot = await aliasRepo.isRootIdentity(request.senderAlias);
  if (isRoot) {
    return createExplicitError('ALIAS_NOT_FOUND', 'L\'alias non è valido.');
  }

  return null;
}

/**
 * Valida rate limit e coda offline.
 * 
 * Vincoli:
 * - Rate limit verificato
 * - Coda offline verificata (max 1000 messaggi)
 */
export async function validateRateLimitAndQueue(
  request: MessageAppendRequest,
  rateLimitRepo: RateLimitRepository,
  offlineQueueRepo: OfflineQueueRepository
): Promise<MessageAppendError | null> {
  // Verifica rate limit (esempio: max 100 messaggi per minuto)
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
  const RATE_LIMIT_MAX_REQUESTS = 100;
  const withinLimit = await rateLimitRepo.checkLimit(
    request.senderAlias,
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS
  );

  if (!withinLimit) {
    return createExplicitError('RATE_LIMIT', 'Limite di messaggi raggiunto.', request.threadId);
  }

  // Verifica coda offline (max 1000 messaggi)
  const queueSize = await offlineQueueRepo.getSize();
  if (queueSize >= 1000) {
    return createExplicitError('OFFLINE_QUEUE_FULL', 'La coda offline è piena.', request.threadId);
  }

  return null;
}

/**
 * Crea messaggio interno (stato DRAFT per offline, SENT per online).
 * 
 * Vincoli (Invarianti SYS-01, SYS-02, SYS-03, SYS-04, SYS-05):
 * - messageId generato server-side, univoco (Append-Only)
 * - threadId obbligatorio (Thread-First)
 * - senderAlias obbligatorio (Alias-Only)
 * - state esplicito (Stato Esplicito)
 * - createdAt arrotondato (Timestamp Arrotondato)
 */
export function createInternalMessage(
  request: MessageAppendRequest,
  isOnline: boolean
): InternalMessage {
  const messageId = randomUUID();
  const now = Date.now();
  const createdAt = roundTimestamp(now); // Invariante SYS-05

  return {
    messageId,
    threadId: request.threadId, // Invariante SYS-02
    senderAlias: request.senderAlias, // Invariante SYS-03
    payload: request.payload,
    state: isOnline ? 'SENT' : 'DRAFT', // Invariante SYS-04
    createdAt,
    clientMessageId: request.clientMessageId,
    retryCount: 0,
  };
}

/**
 * Verifica idempotenza tramite clientMessageId.
 * 
 * Vincoli (Invariante SYS-01):
 * - Se clientMessageId duplicato, restituisce errore esplicito
 * - Nessun overwrite
 */
export async function checkIdempotency(
  clientMessageId: string | undefined,
  messageRepo: MessageRepository
): Promise<InternalMessage | null> {
  if (!clientMessageId) {
    return null;
  }

  const existingMessage = await messageRepo.findByClientMessageId(clientMessageId);
  return existingMessage;
}

/**
 * Esegue append messaggio (core logic).
 * 
 * Vincoli:
 * - Nessuna mutazione fuori dal dominio Message
 * - Nessun side-effect UI o sync
 * - Nessuna generazione implicita di ID o timestamp fuori contratto
 * 
 * @returns Response o Error (mai null)
 */
export async function appendMessage(
  request: MessageAppendRequest,
  isOnline: boolean,
  repositories: {
    threadRepo: ThreadRepository;
    aliasRepo: AliasRepository;
    messageRepo: MessageRepository;
    rateLimitRepo: RateLimitRepository;
    offlineQueueRepo: OfflineQueueRepository;
  }
): Promise<MessageAppendResponse | MessageAppendError> {
  // Validazione request
  const validationError = await validateMessageAppendRequest(
    request,
    repositories.threadRepo,
    repositories.aliasRepo
  );
  if (validationError) {
    return validationError;
  }

  // Validazione rate limit e coda offline
  const rateLimitError = await validateRateLimitAndQueue(
    request,
    repositories.rateLimitRepo,
    repositories.offlineQueueRepo
  );
  if (rateLimitError) {
    return rateLimitError;
  }

  // Verifica idempotenza (se clientMessageId fornito)
  if (request.clientMessageId) {
    const existingMessage = await checkIdempotency(
      request.clientMessageId,
      repositories.messageRepo
    );
    if (existingMessage) {
      return createExplicitError(
        'CLIENT_MESSAGE_ID_DUPLICATE',
        `Il clientMessageId ${request.clientMessageId} esiste gia.`,
        existingMessage.threadId
      );
    }
  }

  // Crea messaggio interno
  const message = createInternalMessage(request, isOnline);

  // Persistenza (delegata a repository)
  await repositories.messageRepo.create(message);

  // Restituisce response (solo stato SENT per contratto)
  return {
    messageId: message.messageId,
    threadId: message.threadId,
    state: 'SENT', // Invariante: stato iniziale obbligatorio
    createdAt: message.createdAt,
    clientMessageId: message.clientMessageId,
  };
}
