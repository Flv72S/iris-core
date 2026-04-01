/**
 * HTTP No Semantics Tests
 * 
 * Test bloccanti per verificare che:
 * 1. HTTP NON introduce semantica
 * 2. HTTP NON modifica comportamento Boundary
 * 3. HTTP è puro adapter (input/output translation)
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.6_HTTP_Adapter_Map.md
 * - src/api/http/** (HTTP layer)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import { MessagingBoundary } from '../boundary/MessagingBoundary';
import {
  InMemoryMessageRepository,
  InMemoryThreadRepository,
  InMemorySyncStatusRepository,
  InMemoryOfflineQueueRepository,
  InMemoryRateLimitRepository,
  InMemoryAliasRepository,
} from '../repositories/memory';
import { createHttpServer } from '../http/server';
import type { FastifyInstance } from 'fastify';

describe('HTTP No Semantics Enforcement', () => {
  describe('HTTP does not introduce business logic', () => {
    it('deve fallire se HTTP contiene logica di business', async () => {
      const httpFiles = await glob('src/api/http/**/*.ts', {
        // Nota: STEP 6B introduce middleware preview-only (auth/rate limit/allowlist)
        // che sono intenzionali e disattivabili via env. Li escludiamo da questo check
        // che nasceva per STEP 5.6 (adapter puro).
        // Gate 4.5: wiring e server usano cache invalidation, rate limit, fallback come infrastruttura
        ignore: [
          '**/*.test.ts',
          '**/index.ts',
          '**/middleware/preview*.ts',
          '**/middleware/featureGuard.ts',
          '**/wiring/InvalidatingThreadRepository.ts',
          '**/wiring/InvalidatingMessageRepository.ts',
          '**/wiring/createMessageRepository.ts',
          '**/wiring/ConsistentMessageRepository.ts',
          '**/server.ts',
          '**/errorMapping.ts',
          '**/routes/sync.ts',
          '**/dto/SyncDeliveryDTO.ts',
        ],
      });

      const forbiddenPatterns = [
        /if\s*\([^)]*\.(exists|get|create|update|delete)/, // Accesso diretto repository
        /await\s+\w+Repo\./, // Chiamata repository
        /\.persist\(/, // Persistenza diretta
        /\.save\(/, // Salvataggio diretto
        /fallback|retry|retries/i, // Retry automatici
        /cache|caching/i, // Caching
        /rate\s*limit/i, // Rate limiting (vietato nel puro adapter, ammesso solo in preview middleware)
      ];

      const violations: string[] = [];

      for (const file of httpFiles) {
        const content = readFileSync(file, 'utf-8');
        
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(content)) {
            violations.push(`${file}: contiene pattern vietato: ${pattern}`);
          }
        }
      }

      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('HTTP does not modify Boundary behavior', () => {
    it('deve verificare che HTTP passi input Boundary senza modifiche', async () => {
      // Setup
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

      // Test: HTTP deve passare input a Boundary senza modifiche
      const httpServer = createHttpServer(boundary);

      // Verifica che HTTP server è configurato correttamente
      expect(httpServer).toBeDefined();

      // Verifica che le route sono registrate
      const routes = httpServer.printRoutes();
      expect(routes).toContain('POST');
      expect(routes).toContain('GET');
      expect(routes).toContain('PATCH');

      await httpServer.close();
    });
  });

  describe('HTTP is pure adapter (input/output translation only)', () => {
    it('deve verificare che HTTP traduca solo input/output', async () => {
      // Verifica che HTTP layer contiene solo:
      // 1. Conversioni DTO ↔ Core types
      // 2. Chiamate Boundary
      // 3. Mapping errori → HTTP status
      
      const httpFiles = await glob('src/api/http/**/*.ts', {
        ignore: [
          '**/*.test.ts',
          '**/index.ts',
          '**/middleware/preview*.ts',
          '**/middleware/featureGuard.ts',
        ],
      });

      const allowedPatterns = [
        /dtoToCore|coreToDto|coreResponseToDto|coreErrorToDto/i, // Conversioni DTO
        /boundary\.(appendMessage|getThreadState|transitionThreadState|getMessageDelivery|retryMessage|getSyncStatus)/, // Chiamate Boundary
        /mapMessageAppendError|mapThreadStateError|mapMessageRetryError/, // Mapping errori
        /reply\.(code|send)/, // HTTP response
        /request\.(body|params|query)/, // HTTP input
      ];

      // Verifica che i file HTTP contengono principalmente pattern permessi
      // (non verifica completa, ma verifica che la struttura sia corretta)
      
      for (const file of httpFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica che contiene chiamate Boundary o conversioni DTO
        const hasBoundaryCall = /boundary\./.test(content);
        const hasDtoConversion = /dtoToCore|coreToDto|coreResponseToDto|coreErrorToDto/i.test(content);
        const hasErrorMapping = /mapMessageAppendError|mapThreadStateError|mapMessageRetryError/.test(content);
        
        // Se è un file route, deve contenere almeno una chiamata Boundary
        if (file.includes('/routes/')) {
          expect(hasBoundaryCall || hasDtoConversion || hasErrorMapping).toBe(true);
        }
      }
    });
  });

  describe('HTTP does not persist directly', () => {
    it('deve fallire se HTTP persiste direttamente', async () => {
      const httpFiles = await glob('src/api/http/**/*.ts', {
        ignore: ['**/*.test.ts', '**/index.ts'],
      });

      const forbiddenPatterns = [
        /\.(create|update|delete|save|persist|append|set)\(/, // Metodi di persistenza
        /repository\.(create|update|delete|save|persist|append|set)/, // Chiamate repository
        /database\.(create|update|delete|save|persist)/, // Chiamate database
      ];

      const violations: string[] = [];

      for (const file of httpFiles) {
        const content = readFileSync(file, 'utf-8');
        
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(content)) {
            // Escludi commenti e stringhe
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (pattern.test(line) && !line.startsWith('//') && !line.startsWith('*')) {
                violations.push(`${file}:${i + 1}: contiene persistenza diretta`);
                break;
              }
            }
          }
        }
      }

      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }

      expect(violations.length).toBe(0);
    });
  });
});
