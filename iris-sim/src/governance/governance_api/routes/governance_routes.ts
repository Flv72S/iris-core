/**
 * Step 8A — Governance API routes. GET only; no write operations.
 */

import type { GovernanceController } from '../controllers/governance_controller.js';

export interface GovernanceRouteMatch {
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, string>;
}

export type RouteHandler = (
  match: GovernanceRouteMatch
) => { status: number; body: unknown; responseHash?: string };

export function createGovernanceRoutes(controller: GovernanceController): Map<string, RouteHandler> {
  const routes = new Map<string, RouteHandler>();

  routes.set('GET /governance/tier', () => controller.getTier());
  routes.set('GET /governance/certificate', () => controller.getCertificate());
  routes.set('GET /governance/sla', () => controller.getSLA());
  routes.set('GET /governance/snapshot', () => controller.getSnapshot());
  routes.set('GET /governance/history', (match) => {
    const params: { limit?: number; from_timestamp?: number } = {};
    if (match.query.limit !== undefined) params.limit = parseInt(match.query.limit, 10);
    if (match.query.from_timestamp !== undefined) params.from_timestamp = parseInt(match.query.from_timestamp, 10);
    return controller.getHistory(params);
  });
  routes.set('GET /governance/state-at', (match) =>
    controller.getStateAt({ timestamp: match.query.timestamp })
  );

  return routes;
}

export function matchGovernanceRoute(
  method: string,
  pathname: string,
  routes: Map<string, RouteHandler>
): { handler: RouteHandler; query: Record<string, string> } | null {
  const query: Record<string, string> = {};
  const qIndex = pathname.indexOf('?');
  const path = qIndex >= 0 ? pathname.slice(0, qIndex) : pathname;
  const qs = qIndex >= 0 ? pathname.slice(qIndex + 1) : '';
  if (qs) {
    for (const part of qs.split('&')) {
      const eq = part.indexOf('=');
      if (eq >= 0) {
        query[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(part.slice(eq + 1));
      }
    }
  }
  const key = `${method} ${path}`;
  const handler = routes.get(key);
  if (handler) return { handler, query };
  return null;
}
