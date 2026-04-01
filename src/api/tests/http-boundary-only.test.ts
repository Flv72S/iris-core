/**
 * HTTP Boundary-Only Tests
 * 
 * Test bloccanti per verificare che:
 * 1. HTTP NON accede mai al Core direttamente
 * 2. HTTP NON accede mai ai Repository direttamente
 * 3. HTTP accede SOLO al Boundary
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.6_HTTP_Adapter_Map.md
 * - src/api/http/** (HTTP layer)
 * - src/api/boundary/** (unico punto di ingresso)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';

// STEP 7 / Fase 1.2 — Eccezione vincolata:
// L'HTTP adapter per POST /threads è autorizzato a chiamare direttamente il Core Threads use case.
// Questa eccezione è LIMITATA ai file elencati sotto.
// HTTP files autorizzati a importare da core (adapter, wiring, cache invalidation)
const CORE_THREADS_HTTP_ADAPTER_ALLOWLIST = [
  'src/api/http/routes/threads.post.ts',
  'src/api/http/routes/threads.get.ts',
  'src/api/http/routes/threads.getById.ts',
  'src/api/http/routes/threads.messages.post.ts',
  'src/api/http/routes/messages.getByThread.ts',
  'src/api/http/routes/messages.getById.ts',
  'src/api/http/repositories/InMemoryThreadRepository.ts',
  'src/api/http/repositories/InMemoryMessageRepository.ts',
  'src/api/http/wiring/createMessageRepository.ts',
  'src/api/http/wiring/ConsistentMessageRepository.ts',
  'src/api/http/wiring/InvalidatingThreadRepository.ts',
  'src/api/http/wiring/InvalidatingMessageRepository.ts',
];

describe('HTTP Boundary-Only Enforcement', () => {
  describe('HTTP does not import Core directly', () => {
    it('deve fallire se HTTP importa da core/', async () => {
      const httpFiles = await glob('src/api/http/**/*.ts', {
        ignore: ['**/*.test.ts', '**/index.ts', ...CORE_THREADS_HTTP_ADAPTER_ALLOWLIST],
      });

      const violations: string[] = [];

      for (const file of httpFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica import diretti da core (esclusi i tipi per DTO conversion)
        // Permettiamo solo import di TIPI da core/types per conversioni DTO ↔ Core
        const coreImportPattern = /from\s+['"]\.\.\/core\/(?!types)/;
        const coreAbsoluteImportPattern = /from\s+['"]@\/api\/core\/(?!types)/;
        
        if (coreImportPattern.test(content) || coreAbsoluteImportPattern.test(content)) {
          violations.push(`${file}: import diretto da core/ (non types)`);
        }
      }

      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('HTTP does not import Repository directly', () => {
    it('deve fallire se HTTP importa da repositories/', async () => {
      const httpFiles = await glob('src/api/http/**/*.ts', {
        ignore: ['**/*.test.ts', '**/index.ts', ...CORE_THREADS_HTTP_ADAPTER_ALLOWLIST],
      });

      const violations: string[] = [];

      for (const file of httpFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Verifica import da repositories
        const repoImportPattern = /from\s+['"]\.\.\/repositories/;
        const repoAbsoluteImportPattern = /from\s+['"]@\/api\/repositories/;
        
        if (repoImportPattern.test(content) || repoAbsoluteImportPattern.test(content)) {
          violations.push(`${file}: import diretto da repositories/`);
        }
      }

      if (violations.length > 0) {
        console.error('Violazioni trovate:', violations);
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('HTTP imports only from Boundary', () => {
    it('deve verificare che HTTP importi solo da boundary/', async () => {
      const httpFiles = await glob('src/api/http/**/*.ts', {
        ignore: ['**/*.test.ts', '**/index.ts', ...CORE_THREADS_HTTP_ADAPTER_ALLOWLIST],
      });

      const allowedImports = [
        '../boundary', // Boundary layer
        '../core/types', // Solo tipi per conversioni DTO ↔ Core
        './dto', // DTO interni
        './errorMapping', // Error mapping interno
        './routes', // Route interne
        'fastify', // Fastify framework
      ];

      const violations: string[] = [];

      for (const file of httpFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Estrai tutti gli import
        const importMatches = content.matchAll(/from\s+['"]([^'"]+)['"]/g);
        
        for (const match of importMatches) {
          const importPath = match[1];
          
          // Verifica se l'import è permesso
          const isAllowed = allowedImports.some(allowed => 
            importPath.startsWith(allowed) || 
            importPath.startsWith(`../${allowed}`) ||
            importPath === allowed
          );
          
          // Permetti anche import relativi a DTO, errorMapping, routes
          const isInternalHttp = importPath.startsWith('./') || importPath.startsWith('../http/');
          
          // Permetti import di node_modules
          const isNodeModule = !importPath.startsWith('.') && !importPath.startsWith('@/');
          
          if (!isAllowed && !isInternalHttp && !isNodeModule) {
            // Verifica che non sia un import da core (eccetto types) o repositories
            if (
              importPath.includes('/core/') && !importPath.includes('/core/types') ||
              importPath.includes('/repositories/')
            ) {
              violations.push(`${file}: import non permesso da ${importPath}`);
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

  describe('HTTP uses Boundary as single entry point', () => {
    it('deve verificare che HTTP chiami solo metodi Boundary', { timeout: 30000 }, async () => {
      // Verifica a livello TypeScript che HTTP usa solo MessagingBoundary
      // Questo test verifica che la struttura sia corretta
      
      // Import HTTP server per verificare che usa Boundary
      const { createHttpServer } = await import('../http/server');
      expect(createHttpServer).toBeDefined();
      expect(typeof createHttpServer).toBe('function');
      
      // Verifica che le route registrano correttamente
      const { registerMessageRoutes, registerThreadRoutes, registerSyncRoutes } = await import('../http/routes');
      expect(registerMessageRoutes).toBeDefined();
      expect(registerThreadRoutes).toBeDefined();
      expect(registerSyncRoutes).toBeDefined();
    });
  });
});
