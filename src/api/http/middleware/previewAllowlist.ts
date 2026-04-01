/**
 * Preview Endpoint Allowlist Middleware (STEP 6B)
 *
 * In preview sono consentiti solo endpoint in allowlist. Resto → 404.
 * Default: /health, /ready, /threads, /sync. Solo se PREVIEW_MODE=true.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLogger } from '../../../observability/logger';
import { getCorrelationId } from './correlation';
import { getPreviewConfigFromEnv, isPreviewPublicPath } from './previewConfig';

const ALLOWLIST_PREFIXES = ['/health', '/ready', '/threads', '/sync'] as const;

function isAllowed(pathname: string): boolean {
  if (isPreviewPublicPath(pathname)) return true;
  return ALLOWLIST_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function addPreviewAllowlistMiddleware(server: FastifyInstance): void {
  const config = getPreviewConfigFromEnv();
  if (!config.previewMode) return;

  const logger = getLogger();

  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = (request as any).url?.split('?')[0] ?? request.url;
    if (isAllowed(pathname)) return;

    const correlationId = getCorrelationId(request);
    const ip = (request as any).ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
    logger.info('http', correlationId, 'Preview allowlist drop', {
      reason: 'not_allowed',
      ip,
      path: pathname,
    });
    return reply
      .code(404)
      .header('content-type', 'application/json')
      .send({ code: 'NOT_FOUND', message: 'Not Found' });
  });
}
