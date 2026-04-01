/**
 * In-Memory Message Repository Implementation
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
 * - src/api/repositories/MessageRepository.ts
 */

import type {
  MessageRepository,
  StoredMessage,
} from '../MessageRepository';

/**
 * In-Memory Message Repository
 * 
 * Implementazione deterministica:
 * - Storage in-memory (Map)
 * - Ordinamento esplicito per createdAt ASC
 * - Nessun side-effect nascosto
 */
export class InMemoryMessageRepository implements MessageRepository {
  private messages: Map<string, StoredMessage> = new Map();
  private messagesByThread: Map<string, StoredMessage[]> = new Map();
  private messagesByClientId: Map<string, StoredMessage> = new Map();

  /**
   * Reset stato repository (per test)
   */
  reset(): void {
    this.messages.clear();
    this.messagesByThread.clear();
    this.messagesByClientId.clear();
  }

  async append(message: StoredMessage): Promise<void> {
    // Verifica che messageId non esista già (append-only, invariante SYS-01)
    if (this.messages.has(message.messageId)) {
      throw new Error(`Message ${message.messageId} already exists (SYS-01: Append-Only)`);
    }

    // Salva messaggio
    this.messages.set(message.messageId, message);

    // Aggiorna indice per thread
    const threadMessages = this.messagesByThread.get(message.threadId) || [];
    threadMessages.push(message);
    // Ordinamento esplicito per createdAt ASC (Invariante SYS-02: Ordine Dichiarato)
    threadMessages.sort((a, b) => a.createdAt - b.createdAt);
    this.messagesByThread.set(message.threadId, threadMessages);

    // Aggiorna indice per clientMessageId (se presente)
    if (message.clientMessageId) {
      this.messagesByClientId.set(message.clientMessageId, message);
    }
  }

  async get(messageId: string, threadId: string): Promise<StoredMessage | null> {
    const message = this.messages.get(messageId);
    if (!message) {
      return null;
    }
    // Verifica che message appartenga al thread corretto (Thread-First, invariante SYS-02)
    if (message.threadId !== threadId) {
      return null;
    }
    return message;
  }

  async listByThread(threadId: string, limit?: number, offset?: number): Promise<StoredMessage[]> {
    const threadMessages = this.messagesByThread.get(threadId) || [];
    
    // Applica offset e limit (Finitudine Esplicita, invariante SYS-10)
    const start = offset ?? 0;
    const end = limit ? start + limit : threadMessages.length;
    
    return threadMessages.slice(start, end);
  }

  async findByClientMessageId(clientMessageId: string): Promise<StoredMessage | null> {
    return this.messagesByClientId.get(clientMessageId) || null;
  }

  async updateDeliveryState(
    messageId: string,
    threadId: string,
    state: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
    timestamp: number,
    failureReason?: string
  ): Promise<void> {
    const message = await this.get(messageId, threadId);
    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    // Aggiorna messaggio (crea nuovo oggetto, immutabile)
    const updatedMessage: StoredMessage = {
      ...message,
      state: state as StoredMessage['state'],
    };

    this.messages.set(messageId, updatedMessage);
    
    // Aggiorna indice per thread
    const threadMessages = this.messagesByThread.get(threadId) || [];
    const index = threadMessages.findIndex(m => m.messageId === messageId);
    if (index >= 0) {
      threadMessages[index] = updatedMessage;
      threadMessages.sort((a, b) => a.createdAt - b.createdAt);
      this.messagesByThread.set(threadId, threadMessages);
    }
  }

  async updateRetryCount(messageId: string, threadId: string, retryCount: number): Promise<void> {
    const message = await this.get(messageId, threadId);
    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    // Aggiorna messaggio (crea nuovo oggetto, immutabile)
    const updatedMessage: StoredMessage = {
      ...message,
      retryCount,
    };

    this.messages.set(messageId, updatedMessage);
    
    // Aggiorna indice per thread
    const threadMessages = this.messagesByThread.get(threadId) || [];
    const index = threadMessages.findIndex(m => m.messageId === messageId);
    if (index >= 0) {
      threadMessages[index] = updatedMessage;
      this.messagesByThread.set(threadId, threadMessages);
    }
  }
}
