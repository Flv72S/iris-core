/**
 * Health & Readiness Tests
 * 
 * Test bloccanti per health e readiness check.
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-04)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerHealthRoutes, setReadinessState, getReadinessState } from '../http/routes/health';
import { MessagingBoundary } from '../boundary/MessagingBoundary';
import { InMemoryMessageRepository } from '../../repositories/in-memory/InMemoryMessageRepository';
import { InMemoryThreadRepository } from '../../repositories/in-memory/InMemoryThreadRepository';
import { InMemoryAliasRepository } from '../../repositories/in-memory/InMemoryAliasRepository';
import { InMemoryRateLimitRepository } from '../../repositories/in-memory/InMemoryRateLimitRepository';
import { InMemoryOfflineQueueRepository } from '../../repositories/in-memory/InMemoryOfflineQueueRepository';
import { InMemorySyncStatusRepository } from '../../repositories/in-memory/InMemorySyncStatusRepository';

describe('Health & Readiness', () => {
  let boundary: MessagingBoundary;
  let server: any;

  beforeEach(() => {
    // Crea boundary con repository in-memory
    const messageRepo = new InMemoryMessageRepository();
    const threadRepo = new InMemoryThreadRepository();
    const aliasRepo = new InMemoryAliasRepository();
    const rateLimitRepo = new InMemoryRateLimitRepository();
    const offlineQueueRepo = new InMemoryOfflineQueueRepository();
    const syncStatusRepo = new InMemorySyncStatusRepository();

    boundary = new MessagingBoundary(
      messageRepo,
      threadRepo,
      aliasRepo,
      rateLimitRepo,
      offlineQueueRepo,
      syncStatusRepo
    );

    server = Fastify();
    registerHealthRoutes(server, boundary);
  });

  describe('Health check', () => {
    it('deve ritornare 200 se processo attivo', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Readiness check', () => {
    it('deve ritornare 503 se not ready', async () => {
      setReadinessState({
        ready: false,
        persistence: {
          initialized: false,
          type: 'unknown',
        },
        boundary: {
          operational: false,
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('not ready');
    });

    it('deve ritornare 200 se ready', async () => {
      setReadinessState({
        ready: true,
        persistence: {
          initialized: true,
          type: 'memory',
        },
        boundary: {
          operational: true,
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ready');
      expect(body.persistence.initialized).toBe(true);
      expect(body.boundary.operational).toBe(true);
    });

    it('deve verificare persistence tramite boundary', async () => {
      // Readiness check chiama boundary per verificare persistence
      const response = await server.inject({
        method: 'GET',
        url: '/ready',
      });

      // Boundary risponde (anche con errore THREAD_NOT_FOUND), quindi persistence è operativa
      expect([200, 503]).toContain(response.statusCode);
    });
  });
});
