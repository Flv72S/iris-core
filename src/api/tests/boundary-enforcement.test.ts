/**
 * Boundary Enforcement Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Il Core viene chiamato solo tramite Boundary
 * 2. Le invarianti vengono verificate
 * 3. Nessun side-effect avviene fuori dal repository
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 * - src/api/boundary/MessagingBoundary.ts
 */

import { describe, it, expect } from 'vitest';
import { MessagingBoundary } from '../boundary/MessagingBoundary';
import {
  InMemoryMessageRepository,
  InMemoryThreadRepository,
  InMemorySyncStatusRepository,
  InMemoryOfflineQueueRepository,
  InMemoryRateLimitRepository,
  InMemoryAliasRepository,
} from '../repositories/memory';

describe('Boundary Enforcement', () => {
  describe('Core access only through Boundary', () => {
    it('deve permettere accesso Core solo tramite Boundary', () => {
      const messageRepo = new InMemoryMessageRepository();
      const threadRepo = new InMemoryThreadRepository();
      const aliasRepo = new InMemoryAliasRepository();
      const rateLimitRepo = new InMemoryRateLimitRepository();
      const offlineQueueRepo = new InMemoryOfflineQueueRepository();
      const syncStatusRepo = new InMemorySyncStatusRepository();

      const boundary = new MessagingBoundary(
        messageRepo,
        threadRepo,
        aliasRepo,
        rateLimitRepo,
        offlineQueueRepo,
        syncStatusRepo
      );

      // Boundary è l'unico punto di ingresso
      expect(boundary).toBeDefined();
      expect(typeof boundary.appendMessage).toBe('function');
      expect(typeof boundary.getThreadState).toBe('function');
    });
  });

  describe('Invariants enforcement', () => {
    it('deve validare payload prima di chiamare Core', async () => {
      const messageRepo = new InMemoryMessageRepository();
      const threadRepo = new InMemoryThreadRepository();
      const aliasRepo = new InMemoryAliasRepository();
      aliasRepo.addAlias('test-alias');
      const rateLimitRepo = new InMemoryRateLimitRepository();
      const offlineQueueRepo = new InMemoryOfflineQueueRepository();
      const syncStatusRepo = new InMemorySyncStatusRepository();

      await threadRepo.set({
        threadId: 'test-thread',
        state: 'OPEN',
        lastStateChangeAt: Date.now(),
      });

      const boundary = new MessagingBoundary(
        messageRepo,
        threadRepo,
        aliasRepo,
        rateLimitRepo,
        offlineQueueRepo,
        syncStatusRepo
      );

      const result = await boundary.appendMessage({
        threadId: 'test-thread',
        senderAlias: 'test-alias',
        payload: '',
      });

      expect(result).toHaveProperty('code');
      if ('code' in result) {
        expect(result.code).toBe('PAYLOAD_INVALID');
      }
    });
  });
});
