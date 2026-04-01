/**
 * Step 8A — HTTP server for Governance Public API. Read-only; GET only.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { GovernanceController } from '../controllers/governance_controller.js';
import { createGovernanceRoutes, matchGovernanceRoute } from '../routes/governance_routes.js';
import { IRIS_API_KEY_HEADER, apiKeyGuard } from '../middleware/api_key_guard.js';
import {
  createRateLimitState,
  rateLimiter,
  getRateLimitPerMinute,
} from '../middleware/rate_limiter.js';
import { auditLogGovernanceQuery } from '../middleware/audit_logger.js';

const UTF8 = 'utf8';

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  return undefined;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json, UTF8),
  });
  res.end(json, UTF8);
}

export interface GovernanceServerOptions {
  controller: GovernanceController;
}

export function createGovernanceHttpServer(options: GovernanceServerOptions): ReturnType<typeof createServer> {
  const { controller } = options;
  const routes = createGovernanceRoutes(controller);
  const rateLimitState = createRateLimitState();
  const limitPerMinute = getRateLimitPerMinute();

  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';
    const pathname = url.split('?')[0] ?? url;

    if (!pathname.startsWith('/governance')) {
      send(res, 404, { error: 'Not Found' });
      return;
    }

    const apiKey = getHeader(req, IRIS_API_KEY_HEADER);
    const guard = apiKeyGuard(apiKey);
    if (!guard.allowed) {
      send(res, 401, { error: guard.reason ?? 'Unauthorized' });
      return;
    }
    const callerId = guard.callerId ?? 'unknown';

    const clientKey = callerId + ':' + (req.socket.remoteAddress ?? 'local');
    const rl = rateLimiter(rateLimitState, clientKey, limitPerMinute);
    if (!rl.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': rl.retryAfterMs ? String(Math.ceil(rl.retryAfterMs / 1000)) : '60',
      });
      res.end(JSON.stringify({ error: 'Too Many Requests' }), UTF8);
      return;
    }

    const match = matchGovernanceRoute(method, url, routes);
    if (!match) {
      if (method !== 'GET') {
        send(res, 405, { error: 'Method Not Allowed. Governance API is read-only.' });
        return;
      }
      send(res, 404, { error: 'Not Found' });
      return;
    }

    const { handler, query } = match;
    const result = handler({ method, path: pathname, query });
    auditLogGovernanceQuery(pathname, callerId, result.responseHash ?? '');
    send(res, result.status, result.body);
  });
}
