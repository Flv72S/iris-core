/**
 * Step 8A — Governance Public API. Read-only layer for external systems.
 */

export type {
  TierStatusResponse,
  GovernanceCertificateResponse,
  SLAGovernanceResponse,
  GovernanceSnapshotResponse,
  GovernanceHistoryEntryResponse,
  GovernanceHistoryResponse,
} from './dto/governance_responses.js';

export type { IGovernanceStateProvider, GovernanceHistoryEntry } from './services/governance_state_provider.js';
export { DefaultGovernanceStateProvider } from './services/governance_state_provider.js';
export { GovernanceQueryService } from './services/governance_query_service.js';

export type { GovernanceControllerResult, StateAtHandler } from './controllers/governance_controller.js';
export { GovernanceController } from './controllers/governance_controller.js';

export { createGovernanceRoutes, matchGovernanceRoute } from './routes/governance_routes.js';
export type { GovernanceRouteMatch, RouteHandler } from './routes/governance_routes.js';

export { apiKeyGuard, IRIS_API_KEY_HEADER } from './middleware/api_key_guard.js';
export type { ApiKeyGuardResult } from './middleware/api_key_guard.js';
export { getRateLimitPerMinute, createRateLimitState, rateLimiter } from './middleware/rate_limiter.js';
export type { RateLimitState, RateLimitResult } from './middleware/rate_limiter.js';
export { auditLogGovernanceQuery, getAuditLog, clearAuditLog } from './middleware/audit_logger.js';
export type { GovernanceAPIQueryLog } from './middleware/audit_logger.js';

export { createGovernanceHttpServer } from './server/governance_server.js';
export type { GovernanceServerOptions } from './server/governance_server.js';
