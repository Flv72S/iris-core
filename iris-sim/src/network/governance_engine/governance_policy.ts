/**
 * Phase 13XX-E — Governance Decision Engine. Policy interface.
 */

import type { NodePassport } from '../node_passport/index.js';
import type { AnomalyEvent } from '../anomaly_detection/index.js';
import type { GovernanceDecision } from './governance_types.js';

/** Policies define how passport + anomalies translate into actions. Deterministic; no randomness. */
export interface GovernancePolicy {
  readonly id: string;
  evaluate(
    passport: NodePassport,
    anomalies: readonly AnomalyEvent[],
    decided_at: number
  ): GovernanceDecision | null;
}
