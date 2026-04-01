/**
 * Repository Purity Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Repository non introducono logica di dominio
 * 2. Repository sono intercambiabili
 * 3. Repository non fanno inferenza o fallback
 */

import { describe, it, expect } from 'vitest';
import {
  InMemoryMessageRepository,
  InMemoryThreadRepository,
} from '../repositories/memory';
import type { StoredMessage } from '../repositories/MessageRepository';

describe('Repository Purity', () => {
  describe('No domain logic in repository', () => {
    it('deve esporre solo operazioni primitive', () => {
      const messageRepo = new InMemoryMessageRepository();
      
      expect(typeof messageRepo.append).toBe('function');
      expect(typeof messageRepo.get).toBe('function');
      expect(typeof messageRepo.listByThread).toBe('function');
    });
  });

  describe('No inference or fallback', () => {
    it('deve restituire null invece di fallback', async () => {
      const messageRepo = new InMemoryMessageRepository();
      const result = await messageRepo.get('non-existent', 'non-existent');
      expect(result).toBeNull();
    });
  });
});
