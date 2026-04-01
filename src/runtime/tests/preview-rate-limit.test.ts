/**
 * Preview Rate Limit Tests (STEP 6B)
 *
 * Test bloccanti per preview rate limiting.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { addPreviewRateLimitMiddleware } from '../../api/http/middleware/previewRateLimit';
import { addCorrelationIdMiddleware } from '../../api/http/middleware/correlation';
import { initializeLogger } from '../../../observability/logger';

describe('Preview Rate Limit', () => {
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
    it('non deve applicare rate limit se PREVIEW_MODE=false', async () => {
      process.env.PREVIEW_MODE = 'false';
      process.env.PREVIEW_RATE_LIMIT_RPM = '2';

      server.get('/test', async () => ({ status: 'ok' }));
      addPreviewRateLimitMiddleware(server);

      // Fai più richieste del limite
      for (let i = 0; i < 10; i++) {
        const response = await server.inject({
          method: 'GET',
          url: '/test',
        });
        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe('Preview mode enabled', () => {
    beforeEach(() => {
      process.env.PREVIEW_MODE = 'true';
      process.env.PREVIEW_RATE_LIMIT_RPM = '2';
      server.get('/test', async () => ({ status: 'ok' }));
      addPreviewRateLimitMiddleware(server);
    });

    it('deve applicare rate limit per IP', async () => {
      // Prime 2 richieste OK
      const response1 = await server.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      expect(response1.statusCode).toBe(200);

      const response2 = await server.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      expect(response2.statusCode).toBe(200);

      // Terza richiesta → 429
      const response3 = await server.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      expect(response3.statusCode).toBe(429);
      const body = JSON.parse(response3.body);
      expect(body.code).toBe('RATE_LIMIT');
      expect(response3.headers['retry-after']).toBeDefined();
    });

    it('non deve applicare rate limit a /health', async () => {
      server.get('/health', async () => ({ status: 'ok' }));

      // Fai molte richieste
      for (let i = 0; i < 10; i++) {
        const response = await server.inject({
          method: 'GET',
          url: '/health',
        });
        expect(response.statusCode).toBe(200);
      }
    });

    it('non deve applicare rate limit a /ready', async () => {
      server.get('/ready', async () => ({ status: 'ready' }));

      // Fai molte richieste
      for (let i = 0; i < 10; i++) {
        const response = await server.inject({
          method: 'GET',
          url: '/ready',
        });
        expect(response.statusCode).toBe(200);
      }
    });
  });
});
