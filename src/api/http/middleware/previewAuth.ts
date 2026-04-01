/**
 * Preview Access Token Middleware (STEP 6B)
 *
 * Verifica X-Preview-Token su ogni request. Skip per /health, /ready.
 * Attivo solo se PREVIEW_MODE=true. Disattivabile via config.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLogger } from '../../../observability/logger';
import { getCorrelationId } from './correlation';
import { getPreviewConfigFromEnv, isPreviewPublicPath } from './previewConfig';

const HEADER = 'x-preview-token';

export function addPreviewAuthMiddleware(server: FastifyInstance): void {
  const config = getPreviewConfigFromEnv();
  if (!config.previewMode) return;

  const logger = getLogger();

  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = (request as any).url?.split('?')[0] ?? request.url;
    if (isPreviewPublicPath(pathname)) return;

    const token = (request.headers[HEADER] ?? request.headers['X-Preview-Token']) as
      | string
      | undefined;
    const correlationId = getCorrelationId(request);
    const ip = (request as any).ip ?? request.headers['x-forwarded-for'] ?? 'unknown';

    if (!token || token !== config.accessToken) {
      logger.warn('http', correlationId, 'Preview auth failed', {
        reason: 'auth_fail',
        ip,
        path: pathname,
      });
      return reply
        .code(401)
        .header('content-type', 'application/json')
        .send({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
  });
}
