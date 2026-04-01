/**
 * Preview Auth Tests (STEP 6B)
 *
 * Test bloccanti per preview access token.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { addPreviewAuthMiddleware } from '../../api/http/middleware/previewAuth';
import { addCorrelationIdMiddleware } from '../../api/http/middleware/correlation';
import { initializeLogger } from '../../../observability/logger';

describe('Preview Auth', () => {
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

  describe('Preview mode disabled', () => {
    it('non deve richiedere token se PREVIEW_MODE=false', async () => {
      process.env.PREVIEW_MODE = 'false';
      process.env.PREVIEW_ACCESS_TOKEN = 'test-token';

      server.get('/test', async () => ({ status: 'ok' }));
      addPreviewAuthMiddleware(server);

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Preview mode enabled', () => {
    beforeEach(() => {
      process.env.PREVIEW_MODE = 'true';
      process.env.PREVIEW_ACCESS_TOKEN = 'test-token-123';
      server.get('/test', async () => ({ status: 'ok' }));
      addPreviewAuthMiddleware(server);
    });

    it('deve richiedere token per endpoint protetti', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('deve accettare token valido', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-preview-token': 'test-token-123',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('deve rifiutare token errato', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-preview-token': 'wrong-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('non deve richiedere token per /health', async () => {
      server.get('/health', async () => ({ status: 'ok' }));

      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });

    it('non deve richiedere token per /ready', async () => {
      server.get('/ready', async () => ({ status: 'ready' }));

      const response = await server.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
