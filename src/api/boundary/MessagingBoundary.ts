/**
 * Messaging Boundary Layer
 * 
 * Unico punto di ingresso al Core API.
 * 
 * Responsabilità ESCLUSIVE:
 * 1. Ricevere input esterno (oggetti plain)
 * 2. Validare pre-Core (schema, limiti, campi obbligatori)
 * 3. Chiamare il Core
 * 4. Persistenza solo tramite repository
 * 5. Restituire output dichiarativo
 * 
 * Vincoli:
 * - Core è intoccabile (src/api/core/** è READ-ONLY)
 * - Nessuna semantica nuova
 * - Nessun side-effect implicito
 * - Nessun accesso diretto al Core dall'esterno
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 * - src/api/core/** (READ-ONLY)
 */

import type {
  MessageAppendRequest,
  MessageAppendResponse,
  MessageAppendError,
  ThreadStateResponse,
  ThreadStateError,
  ThreadStateTransitionRequest,
  ThreadStateTransitionResponse,
  MessageDeliveryResponse,
  MessageRetryRequest,
  MessageRetryResponse,
  MessageRetryError,
  SyncStatusResponse,
} from '../core/types';
import {
  appendMessage,
  type ThreadRepository as CoreThreadRepository,
  type AliasRepository as CoreAliasRepository,
  type MessageRepository as CoreMessageRepository,
  type RateLimitRepository as CoreRateLimitRepository,
  type OfflineQueueRepository as CoreOfflineQueueRepository,
} from '../core/messageAppend';
import {
  getThreadState,
  transitionThreadState,
  type ThreadRepository as CoreThreadStateRepository,
} from '../core/threadState';
import {
  getMessageDelivery,
  retryMessage,
  getSyncStatus,
  type MessageRepository as CoreDeliveryMessageRepository,
  type ThreadRepository as CoreDeliveryThreadRepository,
  type SyncStatusRepository as CoreSyncStatusRepository,
  type OfflineQueueRepository as CoreSyncOfflineQueueRepository,
} from '../core/syncDelivery';
import {
  validatePayload,
  roundTimestamp,
} from '../core/invariants';
import type {
  MessageRepository,
  ThreadRepository,
  SyncStatusRepository,
  OfflineQueueRepository,
  RateLimitRepository,
  AliasRepository,
} from '../repositories';

/**
 * Adapter: Repository Boundary → Core Repository
 * 
 * Converte repository boundary in repository core.
 */
class RepositoryAdapter {
  constructor(
    private messageRepo: MessageRepository,
    private threadRepo: ThreadRepository,
    private aliasRepo: AliasRepository,
    private rateLimitRepo: RateLimitRepository,
    private offlineQueueRepo: OfflineQueueRepository,
    private syncStatusRepo: SyncStatusRepository
  ) {}

  // Adapter per Message Append
  getMessageAppendRepositories(): {
    threadRepo: CoreThreadRepository;
    aliasRepo: CoreAliasRepository;
    messageRepo: CoreMessageRepository;
    rateLimitRepo: CoreRateLimitRepository;
    offlineQueueRepo: CoreOfflineQueueRepository;
  } {
    return {
      threadRepo: {
        exists: (threadId: string) => this.threadRepo.exists(threadId),
        getState: (threadId: string) => this.threadRepo.getState(threadId),
      },
      aliasRepo: {
        exists: (aliasId: string) => this.aliasRepo.exists(aliasId),
        isRootIdentity: (aliasId: string) => this.aliasRepo.isRootIdentity(aliasId),
      },
      messageRepo: {
        findByClientMessageId: (clientMessageId: string) => this.messageRepo.findByClientMessageId(clientMessageId),
        create: (message) => this.messageRepo.append(message),
      },
      rateLimitRepo: {
        checkLimit: (senderAlias: string, windowMs: number, maxRequests: number) =>
          this.rateLimitRepo.checkLimit(senderAlias, windowMs, maxRequests),
      },
      offlineQueueRepo: {
        getSize: () => this.offlineQueueRepo.getSize(),
      },
    };
  }

  // Adapter per Thread State
  getThreadStateRepository(): CoreThreadStateRepository {
    return {
      exists: (threadId: string) => this.threadRepo.exists(threadId),
      get: (threadId: string) => this.threadRepo.get(threadId),
      updateState: (threadId: string, newState, transitionedAt: number) =>
        this.threadRepo.updateState(threadId, newState, transitionedAt),
    };
  }

  // Adapter per Sync/Delivery
  getDeliveryRepositories(): {
    messageRepo: CoreDeliveryMessageRepository;
    threadRepo: CoreDeliveryThreadRepository;
  } {
    return {
      messageRepo: {
        get: (messageId: string, threadId: string) => this.messageRepo.get(messageId, threadId),
        updateDeliveryState: (messageId: string, threadId: string, state, timestamp: number, failureReason?: string) =>
          this.messageRepo.updateDeliveryState(messageId, threadId, state, timestamp, failureReason),
        updateRetryCount: (messageId: string, threadId: string, retryCount: number) =>
          this.messageRepo.updateRetryCount(messageId, threadId, retryCount),
      },
      threadRepo: {
        getState: (threadId: string) => this.threadRepo.getState(threadId),
      },
    };
  }

  getSyncRepositories(): {
    syncStatusRepo: CoreSyncStatusRepository;
    offlineQueueRepo: CoreSyncOfflineQueueRepository;
  } {
    return {
      syncStatusRepo: {
        getLastSyncAt: () => this.syncStatusRepo.getLastSyncAt(),
        getEstimatedLatency: () => this.syncStatusRepo.getEstimatedLatency(),
      },
      offlineQueueRepo: {
        getSize: () => this.offlineQueueRepo.getSize(),
        getPendingMessages: () => this.offlineQueueRepo.getPendingMessages(),
      },
    };
  }
}

/**
 * Messaging Boundary
 * 
 * Unico punto di ingresso al Core API.
 */
export class MessagingBoundary {
  private adapter: RepositoryAdapter;

  constructor(
    messageRepo: MessageRepository,
    threadRepo: ThreadRepository,
    aliasRepo: AliasRepository,
    rateLimitRepo: RateLimitRepository,
    offlineQueueRepo: OfflineQueueRepository,
    syncStatusRepo: SyncStatusRepository
  ) {
    this.adapter = new RepositoryAdapter(
      messageRepo,
      threadRepo,
      aliasRepo,
      rateLimitRepo,
      offlineQueueRepo,
      syncStatusRepo
    );
  }

  /**
   * Append messaggio
   * 
   * Vincoli:
   * - Validazione pre-Core
   * - Chiamata Core
   * - Persistenza tramite repository
   * - Output dichiarativo
   */
  async appendMessage(
    request: MessageAppendRequest,
    isOnline: boolean = true
  ): Promise<MessageAppendResponse | MessageAppendError> {
    // Validazione pre-Core: payload
    const payloadError = validatePayload(request.payload);
    if (payloadError) {
      return payloadError;
    }

    // Chiamata Core
    const repositories = this.adapter.getMessageAppendRepositories();
    return appendMessage(request, isOnline, repositories);
  }

  /**
   * Ottiene stato thread
   * 
   * Vincoli:
   * - Validazione pre-Core
   * - Chiamata Core
   * - Output dichiarativo
   */
  async getThreadState(threadId: string): Promise<ThreadStateResponse | ThreadStateError> {
    // Chiamata Core (validazione interna)
    const threadRepo = this.adapter.getThreadStateRepository();
    return getThreadState(threadId, threadRepo);
  }

  /**
   * Transizione stato thread
   * 
   * Vincoli:
   * - Validazione pre-Core
   * - Chiamata Core
   * - Persistenza tramite repository
   * - Output dichiarativo
   */
  async transitionThreadState(
    request: ThreadStateTransitionRequest
  ): Promise<ThreadStateTransitionResponse | ThreadStateError> {
    // Validazione pre-Core: reason max 500 caratteri
    if (request.reason && request.reason.length > 500) {
      return {
        code: 'INVALID_TRANSITION',
        message: 'Il motivo della transizione non può superare 500 caratteri.',
        threadId: request.threadId,
        requestedState: request.targetState,
      };
    }

    // Chiamata Core
    const threadRepo = this.adapter.getThreadStateRepository();
    return transitionThreadState(request, threadRepo);
  }

  /**
   * Ottiene delivery messaggio
   * 
   * Vincoli:
   * - Chiamata Core
   * - Output dichiarativo
   */
  async getMessageDelivery(
    messageId: string,
    threadId: string
  ): Promise<MessageDeliveryResponse | MessageRetryError> {
    // Chiamata Core
    const { messageRepo } = this.adapter.getDeliveryRepositories();
    return getMessageDelivery(messageId, threadId, messageRepo);
  }

  /**
   * Retry messaggio
   * 
   * Vincoli:
   * - Chiamata Core
   * - Persistenza tramite repository
   * - Output dichiarativo
   */
  async retryMessage(request: MessageRetryRequest): Promise<MessageRetryResponse | MessageRetryError> {
    // Chiamata Core
    const { messageRepo, threadRepo } = this.adapter.getDeliveryRepositories();
    return retryMessage(request, messageRepo, threadRepo);
  }

  /**
   * Ottiene sync status
   * 
   * Vincoli:
   * - Chiamata Core
   * - Output dichiarativo
   */
  async getSyncStatus(isOnline: boolean): Promise<SyncStatusResponse> {
    // Chiamata Core
    const repositories = this.adapter.getSyncRepositories();
    return getSyncStatus(isOnline, repositories);
  }
}
