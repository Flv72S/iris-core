/**
 * Phase 13XX-C — Node Passport System. Types.
 */

import type { NodeIdentity, NodeRegistration } from '../node_identity/index.js';

export type GovernanceFlag =
  | 'UNDER_REVIEW'
  | 'HIGH_RISK'
  | 'TRUST_BOOST'
  | 'LIMITED_PROPAGATION'
  | 'SANCTIONED';

/** Trust and reputation scores in range [0, 1]. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 1;

/**
 * Canonical identity and trust profile for a node.
 * Read-optimized; no business logic. Aggregates identity, registration, trust, reputation, anomaly, governance.
 */
export interface NodePassport {
  readonly node_id: string;
  readonly identity: NodeIdentity;
  readonly registration: NodeRegistration;
  readonly trust_score: number;
  readonly reputation_score: number;
  readonly anomaly_count: number;
  readonly last_anomaly_timestamp?: number | undefined;
  readonly governance_flags: readonly GovernanceFlag[];
  readonly created_at: number;
  readonly updated_at: number;
}

export function clampScore(score: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
}

export function isValidScore(score: number): boolean {
  return typeof score === 'number' && !Number.isNaN(score) && score >= SCORE_MIN && score <= SCORE_MAX;
}
