/**
 * In-Memory Sync Repository Implementation
 * 
 * Implementazione deterministica in-memory per test e sviluppo.
 * 
 * Vincoli:
 * - Dati finiti
 * - Nessun random
 * - Nessun clock implicito
 * - Stato esplicito resettabile
 * 
 * Riferimenti vincolanti:
 * - src/api/repositories/SyncRepository.ts
 */

import type {
  SyncStatusRepository,
  OfflineQueueRepository,
  RateLimitRepository,
  AliasRepository,
} from '../SyncRepository';
import type { InternalMessage } from '../../core/types';

/**
 * In-Memory Sync Status Repository
 */
export class InMemorySyncStatusRepository implements SyncStatusRepository {
  private lastSyncAt: number | null = null;
  private estimatedLatency: number | null = null;

  reset(): void {
    this.lastSyncAt = null;
    this.estimatedLatency = null;
  }

  async getLastSyncAt(): Promise<number | null> {
    return this.lastSyncAt;
  }

  async setLastSyncAt(timestamp: number): Promise<void> {
    this.lastSyncAt = timestamp;
  }

  async getEstimatedLatency(): Promise<number | null> {
    return this.estimatedLatency;
  }

  async setEstimatedLatency(latencyMs: number): Promise<void> {
    this.estimatedLatency = latencyMs;
  }
}

/**
 * In-Memory Offline Queue Repository
 */
export class InMemoryOfflineQueueRepository implements OfflineQueueRepository {
  private queue: InternalMessage[] = [];
  private readonly MAX_QUEUE_SIZE = 1000;

  reset(): void {
    this.queue = [];
  }

  async getSize(): Promise<number> {
    return this.queue.length;
  }

  async getPendingMessages(): Promise<InternalMessage[]> {
    // Ordinamento esplicito per createdAt ASC
    return [...this.queue].sort((a, b) => a.createdAt - b.createdAt);
  }

  async enqueue(message: InternalMessage): Promise<void> {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error(`Offline queue is full: ${this.queue.length} >= ${this.MAX_QUEUE_SIZE}`);
    }
    this.queue.push(message);
  }

  async dequeue(messageId: string): Promise<void> {
    const index = this.queue.findIndex(m => m.messageId === messageId);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }
}

/**
 * In-Memory Rate Limit Repository
 */
export class InMemoryRateLimitRepository implements RateLimitRepository {
  private requests: Map<string, number[]> = new Map();

  reset(): void {
    this.requests.clear();
  }

  async checkLimit(senderAlias: string, windowMs: number, maxRequests: number): Promise<boolean> {
    const now = Date.now();
    const aliasRequests = this.requests.get(senderAlias) || [];
    
    // Rimuove richieste fuori dalla finestra
    const recentRequests = aliasRequests.filter(timestamp => now - timestamp < windowMs);
    
    // Aggiorna mappa
    this.requests.set(senderAlias, recentRequests);
    
    // Verifica limite
    return recentRequests.length < maxRequests;
  }

  async recordRequest(senderAlias: string, timestamp: number): Promise<void> {
    const aliasRequests = this.requests.get(senderAlias) || [];
    aliasRequests.push(timestamp);
    this.requests.set(senderAlias, aliasRequests);
  }
}

/**
 * In-Memory Alias Repository
 */
export class InMemoryAliasRepository implements AliasRepository {
  private aliases: Set<string> = new Set();
  private rootIdentities: Set<string> = new Set();

  reset(): void {
    this.aliases.clear();
    this.rootIdentities.clear();
  }

  /**
   * Aggiunge alias (per test)
   */
  addAlias(aliasId: string, isRoot: boolean = false): void {
    this.aliases.add(aliasId);
    if (isRoot) {
      this.rootIdentities.add(aliasId);
    }
  }

  async exists(aliasId: string): Promise<boolean> {
    return this.aliases.has(aliasId);
  }

  async isRootIdentity(aliasId: string): Promise<boolean> {
    return this.rootIdentities.has(aliasId);
  }
}
