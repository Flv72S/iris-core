/**
 * Preview Mode Banner Middleware (STEP 6B)
 *
 * Aggiunge X-IRIS-Mode: PREVIEW a ogni risposta. Solo se PREVIEW_MODE=true.
 * Disattivabile via config.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPreviewConfigFromEnv } from './previewConfig';

export function addPreviewBannerMiddleware(server: FastifyInstance): void {
  const config = getPreviewConfigFromEnv();
  if (!config.previewMode) return;

  server.addHook('onRequest', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-IRIS-Mode', 'PREVIEW');
  });
}
