/**
 * Feature Flag OFF Tests (STEP 6C)
 *
 * Feature OFF => endpoint protetto non raggiungibile (404).
 * Flag mancante => OFF.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { initializeLogger } from '../../observability/logger';
import { addCorrelationIdMiddleware } from '../../api/http/middleware/correlation';
import { addFeatureGuard } from '../../api/http/middleware/featureGuard';
import { loadFeatureFlagsFromEnv } from '../featureFlags/loadFeatureFlags';

describe('Feature Flags - OFF', () => {
  let server: any;
  const originalEnv = process.env;

  beforeEach(() => {
    initializeLogger('info');
    server = Fastify();
    addCorrelationIdMiddleware(server);
    process.env = { ...originalEnv };
    process.env.PREVIEW_MODE = 'false';
  });

  afterEach(async () => {
    await server.close();
    process.env = originalEnv;
  });

  it('FEATURE_THREADS_ENABLED=false => /threads/* ritorna 404', async () => {
    process.env.FEATURE_THREADS_ENABLED = 'false';
    process.env.FEATURE_SYNC_ENABLED = 'true';

    const flags = loadFeatureFlagsFromEnv(process.env);
    addFeatureGuard(server, flags);

    server.get('/threads/:threadId/state', async () => ({ ok: true }));

    const response = await server.inject({
      method: 'GET',
      url: '/threads/t1/state',
    });

    expect(response.statusCode).toBe(404);
  });

  it('flag mancante => OFF => /sync/* ritorna 404', async () => {
    // FEATURE_SYNC_ENABLED missing
    process.env.FEATURE_THREADS_ENABLED = 'true';

    const flags = loadFeatureFlagsFromEnv(process.env);
    addFeatureGuard(server, flags);

    server.get('/sync/status', async () => ({ ok: true }));

    const response = await server.inject({
      method: 'GET',
      url: '/sync/status',
    });

    expect(response.statusCode).toBe(404);
  });
});

