/**
 * Feature Flag ON Tests (STEP 6C)
 *
 * Feature ON => comportamento invariato (pass-through).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { initializeLogger } from '../../observability/logger';
import { addCorrelationIdMiddleware } from '../../api/http/middleware/correlation';
import { addFeatureGuard } from '../../api/http/middleware/featureGuard';
import { loadFeatureFlagsFromEnv } from '../featureFlags/loadFeatureFlags';

describe('Feature Flags - ON', () => {
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

  it('FEATURE_THREADS_ENABLED=true => /threads/* raggiungibile', async () => {
    process.env.FEATURE_THREADS_ENABLED = 'true';
    process.env.FEATURE_SYNC_ENABLED = 'true';

    const flags = loadFeatureFlagsFromEnv(process.env);
    addFeatureGuard(server, flags);

    server.get('/threads/:threadId/state', async () => ({ ok: true }));

    const response = await server.inject({
      method: 'GET',
      url: '/threads/t1/state',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true });
  });
});

