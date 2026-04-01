/**
 * Bootstrap Swap Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Swap InMemory ↔ SQLite funziona senza errori
 * 2. Output è identico tra le due implementazioni
 * 3. Nessuna rottura nel bootstrap
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import { describe, it, expect } from 'vitest';
import { createApp, type AppConfig } from '../bootstrap/AppBootstrap';
import {
  InMemoryAliasRepository,
  InMemoryThreadRepository,
} from '../../api/repositories/memory';
import {
  SQLiteAliasRepository,
  SQLiteThreadRepository,
} from '../../api/repositories/sqlite';
import { createDatabase, closeDatabase } from '../../api/repositories/sqlite';

describe('Bootstrap Swap', () => {
  describe('Memory to SQLite swap', () => {
    it('deve permettere swap senza modifiche al Boundary', async () => {
      // App con memory
      const memoryConfig: AppConfig = {
        persistence: 'memory',
        http: {
          port: 3000,
        },
      };
      
      const memoryApp = createApp(memoryConfig);
      
      // App con sqlite
      const sqliteConfig: AppConfig = {
        persistence: 'sqlite',
        http: {
          port: 3001,
        },
        sqlite: {
          filePath: ':memory:',
        },
      };
      
      const sqliteApp = createApp(sqliteConfig);
      
      // Verifica che entrambe le app siano funzionanti
      expect(memoryApp.boundary).toBeDefined();
      expect(sqliteApp.boundary).toBeDefined();
      
      // Verifica che Boundary abbia gli stessi metodi
      expect(typeof memoryApp.boundary.appendMessage).toBe('function');
      expect(typeof sqliteApp.boundary.appendMessage).toBe('function');
      
      // Cleanup
      await memoryApp.shutdown();
      await sqliteApp.shutdown();
    });
  });

  describe('Repository interchangeability', () => {
    it('deve permettere swap repository senza modifiche Boundary', async () => {
      // Setup: crea thread in entrambi i repository
      const memoryThreadRepo = new InMemoryThreadRepository();
      const memoryAliasRepo = new InMemoryAliasRepository();
      memoryAliasRepo.addAlias('test-alias');
      
      const db = createDatabase(':memory:');
      const sqliteThreadRepo = new SQLiteThreadRepository(db);
      const sqliteAliasRepo = new SQLiteAliasRepository(db);
      sqliteAliasRepo.addAlias('test-alias');
      
      try {
        const threadId = 'test-thread';
        const now = Date.now();
        
        // Crea thread in entrambi
        await memoryThreadRepo.set({
          threadId,
          state: 'OPEN',
          lastStateChangeAt: now,
        });
        
        await sqliteThreadRepo.set({
          threadId,
          state: 'OPEN',
          lastStateChangeAt: now,
        });
        
        // Verifica che entrambi abbiano lo stesso stato
        const memoryState = await memoryThreadRepo.getState(threadId);
        const sqliteState = await sqliteThreadRepo.getState(threadId);
        
        expect(memoryState).toBe(sqliteState);
      } finally {
        closeDatabase(db);
      }
    });
  });
});
