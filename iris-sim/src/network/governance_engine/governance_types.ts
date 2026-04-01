/**
 * Phase 13XX-E — Governance Decision Engine. Types.
 */

import type { AnomalySeverity } from '../anomaly_detection/index.js';

export type GovernanceAction =
  | 'NO_ACTION'
  | 'FLAG_UNDER_REVIEW'
  | 'LIMIT_PROPAGATION'
  | 'SUSPEND_NODE'
  | 'REVOKE_NODE'
  | 'ESCALATE_MANUAL_REVIEW';

/** Every decision must contain a clear explanation; decided_at injected externally. */
export interface GovernanceDecision {
  readonly node_id: string;
  readonly action: GovernanceAction;
  readonly reason: string;
  readonly severity: AnomalySeverity;
  readonly decided_at: number;
}
