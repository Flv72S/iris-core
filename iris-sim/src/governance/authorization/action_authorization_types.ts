/**
 * Phase 12C — Action Authorization Layer. Types.
 * All types are immutable and JSON-safe.
 */

/** Result of an authorization check. */
export type AuthorizationStatus =
  | 'AUTHORIZED'
  | 'UNAUTHORIZED'
  | 'SCOPE_VIOLATION'
  | 'ROLE_VIOLATION';

/** Authorization result for a governance action. Immutable, deterministic. */
export interface GovernanceAuthorizationResult {
  readonly action_id: string;
  readonly initiator_id: string;
  readonly status: AuthorizationStatus;
  readonly evaluated_timestamp: number;
  readonly metadata: Record<string, unknown>;
}

/** Deterministic role model for governance. */
export type GovernanceRole = 'ADMIN' | 'GOVERNOR' | 'OBSERVER';
