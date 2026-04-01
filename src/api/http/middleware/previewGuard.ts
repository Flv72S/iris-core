/**
 * Preview Guard (STEP 6B)
 *
 * Compone i controlli preview in ordine:
 * 1. Preview Mode check (solo se PREVIEW_MODE=true)
 * 2. Banner (X-IRIS-Mode)
 * 3. Allowlist (prima del token: blocca subito path non permessi)
 * 4. Access Token
 * 5. Rate Limit
 *
 * Allowlist prima dell’auth così path non in lista ritornano 404 senza log token.
 * Poi auth e rate limit su path permessi.
 *
 * Riferimenti: IRIS_STEP6B_Preview_Access_Model.md
 */

import type { FastifyInstance } from 'fastify';
import { addPreviewBannerMiddleware } from './previewBanner';
import { addPreviewAllowlistMiddleware } from './previewAllowlist';
import { addPreviewAuthMiddleware } from './previewAuth';
import { addPreviewRateLimitMiddleware } from './previewRateLimit';
import { getPreviewConfigFromEnv } from './previewConfig';

export function addPreviewGuard(server: FastifyInstance): void {
  const config = getPreviewConfigFromEnv();
  if (!config.previewMode) return;

  addPreviewBannerMiddleware(server);
  addPreviewAllowlistMiddleware(server);
  addPreviewAuthMiddleware(server);
  addPreviewRateLimitMiddleware(server);
}
