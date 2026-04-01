/**
 * Preview Rate Limit Middleware (STEP 6B)
 *
 * Rate limit in-memory per IP. Solo se PREVIEW_MODE=true.
 * Configurabile via PREVIEW_RATE_LIMIT_RPM. Disattivabile via config.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLogger } from '../../../observability/logger';
import { getCorrelationId } from './correlation';
import { getPreviewConfigFromEnv, isPreviewPublicPath } from './previewConfig';

const store = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: FastifyRequest): string {
  const ip = (request as any).ip ?? request.headers['x-forwarded-for'];
  if (typeof ip === 'string') return ip;
  if (Array.isArray(ip) && ip[0]) return String(ip[0]);
  return 'unknown';
}

export function addPreviewRateLimitMiddleware(server: FastifyInstance): void {
  const config = getPreviewConfigFromEnv();
  if (!config.previewMode) return;

  const logger = getLogger();
  const rpm = config.rateLimitRpm;
  const windowMs = 60_000;

  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = (request as any).url?.split('?')[0] ?? request.url;
    if (isPreviewPublicPath(pathname)) return;

    const ip = getClientIp(request);
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > rpm) {
      const correlationId = getCorrelationId(request);
      logger.warn('http', correlationId, 'Preview rate limit exceeded', {
        reason: 'rate_limit',
        ip,
        path: pathname,
      });
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return reply
        .code(429)
        .header('retry-after', String(retryAfter))
        .header('content-type', 'application/json')
        .send({ code: 'RATE_LIMIT', message: 'Too Many Requests' });
    }
  });
}
