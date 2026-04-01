/**
 * Preview Guard Tests (STEP 6B)
 *
 * Test bloccanti per preview guard completo.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { addPreviewGuard } from '../../api/http/middleware/previewGuard';
import { addCorrelationIdMiddleware } from '../../api/http/middleware/correlation';
import { initializeLogger } from '../../../observability/logger';

describe('Preview Guard', () => {
  let server: any;
  const originalEnv = process.env;

  beforeEach(() => {
    initializeLogger('info');
    server = Fastify();
    addCorrelationIdMiddleware(server);
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    await server.close();
    process.env = originalEnv;
  });

  describe('Preview mode enabled', () => {
    beforeEach(() => {
      process.env.PREVIEW_MODE = 'true';
      process.env.PREVIEW_ACCESS_TOKEN = 'test-token-123';
      process.env.PREVIEW_RATE_LIMIT_RPM = '100';
      server.get('/health', async () => ({ status: 'ok' }));
      server.get('/ready', async () => ({ status: 'ready' }));
      server.get('/threads/:id', async () => ({ status: 'ok' }));
      server.get('/forbidden', async () => ({ status: 'ok' }));
      addPreviewGuard(server);
    });

    it('deve aggiungere header X-IRIS-Mode: PREVIEW', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-iris-mode']).toBe('PREVIEW');
    });

    it('deve permettere /health senza token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-iris-mode']).toBe('PREVIEW');
    });

    it('deve permettere /ready senza token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-iris-mode']).toBe('PREVIEW');
    });

    it('deve richiedere token per /threads', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/threads/123',
      });

      expect(response.statusCode).toBe(401);
    });

    it('deve permettere /threads con token valido', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/threads/123',
        headers: {
          'x-preview-token': 'test-token-123',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-iris-mode']).toBe('PREVIEW');
    });

    it('deve bloccare endpoint non in allowlist con 404', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/forbidden',
        headers: {
          'x-preview-token': 'test-token-123',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('NOT_FOUND');
    });
  });

  describe('Preview mode disabled', () => {
    beforeEach(() => {
      process.env.PREVIEW_MODE = 'false';
      server.get('/test', async () => ({ status: 'ok' }));
      addPreviewGuard(server);
    });

    it('non deve aggiungere header X-IRIS-Mode se PREVIEW_MODE=false', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.headers['x-iris-mode']).toBeUndefined();
    });

    it('non deve richiedere token se PREVIEW_MODE=false', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
