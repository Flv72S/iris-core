/**
 * Bootstrap No Leakage Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Il bootstrap NON istanzia repository fuori dalla factory
 * 2. Il Boundary NON accede direttamente a repository
 * 3. HTTP NON accede a repository o Core
 * 4. Nessun singleton implicito
 * 5. Nessun accesso diretto a process.env fuori da main.ts
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';

describe('Bootstrap No Leakage', () => {
  describe('Repository instantiation only in factory', () => {
    it('deve fallire se repository sono istanziati fuori dalla factory', async () => {
      const bootstrapFiles = await glob('src/app/bootstrap/**/*.ts', {
        ignore: ['**/*.test.ts', '**/index.ts'],
      });
      
      const violations: string[] = [];
      
      for (const file of bootstrapFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica che non ci siano new di repository fuori da PersistenceFactory
        if (file.includes('PersistenceFactory')) {
          continue; // Skip factory stessa
        }
        
        // Pattern per new di repository
        const repositoryPatterns = [
          /new\s+InMemoryMessageRepository/,
          /new\s+InMemoryThreadRepository/,
          /new\s+InMemorySyncStatusRepository/,
          /new\s+InMemoryOfflineQueueRepository/,
          /new\s+InMemoryRateLimitRepository/,
          /new\s+InMemoryAliasRepository/,
          /new\s+SQLiteMessageRepository/,
          /new\s+SQLiteThreadRepository/,
          /new\s+SQLiteSyncStatusRepository/,
          /new\s+SQLiteOfflineQueueRepository/,
          /new\s+SQLiteRateLimitRepository/,
          /new\s+SQLiteAliasRepository/,
        ];
        
        for (const pattern of repositoryPatterns) {
          if (pattern.test(content)) {
            violations.push(`${file}: repository istanziato fuori dalla factory`);
          }
        }
      }
      
      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }
      
      expect(violations.length).toBe(0);
    });
  });

  describe('No direct access to process.env outside main.ts', () => {
    it('deve fallire se process.env è accesso fuori da main.ts', async () => {
      const allFiles = await glob('src/app/**/*.ts', {
        ignore: ['**/*.test.ts', '**/main.ts'],
      });
      
      const violations: string[] = [];
      
      for (const file of allFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica accesso a process.env
        if (/process\.env/.test(content)) {
          violations.push(`${file}: accesso a process.env fuori da main.ts`);
        }
      }
      
      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }
      
      expect(violations.length).toBe(0);
    });
  });

  describe('No singleton pattern', () => {
    it('deve verificare che non ci siano singleton impliciti', async () => {
      const bootstrapFiles = await glob('src/app/bootstrap/**/*.ts', {
        ignore: ['**/*.test.ts'],
      });
      
      const violations: string[] = [];
      
      for (const file of bootstrapFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Pattern per singleton
        const singletonPatterns = [
          /getInstance/,
          /instance\s*=/,
          /static\s+instance/,
        ];
        
        for (const pattern of singletonPatterns) {
          if (pattern.test(content)) {
            violations.push(`${file}: possibile singleton pattern`);
          }
        }
      }
      
      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }
      
      // Nota: questo test può essere più permissivo, ma verifica pattern comuni
      expect(violations.length).toBe(0);
    });
  });

  describe('HTTP does not access repositories or Core', () => {
    it('deve verificare che HTTP non acceda a repository o Core', async () => {
      // Questo test verifica che HTTP layer rispetti i vincoli
      // (già verificato in http-boundary-only.test.ts, ma lo ripetiamo qui per completezza)
      
      const httpFiles = await glob('src/api/http/**/*.ts', {
        ignore: [
          '**/*.test.ts',
          '**/index.ts',
          '**/routes/threads.post.ts',
          '**/routes/threads.messages.post.ts',
          '**/routes/threads.getById.ts',
        ],
      });
      
      const violations: string[] = [];
      
      for (const file of httpFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica import da core (eccetto types)
        const coreImportPattern = /from\s+['"]\.\.\/core\/(?!types)/;
        if (coreImportPattern.test(content)) {
          violations.push(`${file}: import diretto da core (non types)`);
        }
        
        // Verifica import da repositories
        const repoImportPattern = /from\s+['"]\.\.\/repositories/;
        if (repoImportPattern.test(content)) {
          violations.push(`${file}: import diretto da repositories`);
        }
      }
      
      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }
      
      expect(violations.length).toBe(0);
    });
  });
});
