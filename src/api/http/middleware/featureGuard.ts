/**
 * Feature Guard Middleware (STEP 6C)
 *
 * Responsabilità ESCLUSIVE:
 * - intercettare richieste HTTP
 * - determinare se endpoint è protetto da feature flag
 * - se flag OFF => HTTP 404 (fail-closed, no leakage)
 * - se flag ON => pass-through
 *
 * Vincoli:
 * - il middleware non conosce preview mode
 * - nessun coupling con access control
 * - nessuna semantica nuova: solo gating
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLogger } from '../../../observability/logger';
import { getCorrelationId } from './correlation';
import { matchProtectedFlag } from '../../../runtime/featureFlags/FeatureFlagRegistry';
import type { FeatureFlagStateMap } from '../../../runtime/featureFlags/loadFeatureFlags';

export function addFeatureGuard(server: FastifyInstance, flags: FeatureFlagStateMap): void {
  const logger = getLogger();

  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = (request as any).url?.split('?')[0] ?? request.url;
    const matched = matchProtectedFlag(pathname);
    if (!matched) return;

    if (!flags[matched]) {
      const correlationId = getCorrelationId(request);
      const ip = (request as any).ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
      // Audit log (no secrets)
      logger.info('http', correlationId, 'Feature flag OFF - endpoint gated', {
        reason: 'feature_off',
        ip,
        path: pathname,
        flag: matched,
      });
      return reply
        .code(404)
        .header('content-type', 'application/json')
        .send({ code: 'NOT_FOUND', message: 'Not Found' });
    }
  });
}

