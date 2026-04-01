/**
 * Phase 13J — Trust Pipeline Orchestrator. Input types.
 */

import type { NodeBehaviorProfile } from '../behavior_monitoring/index.js';
import type { NodeTrustState } from '../trust_recovery/index.js';

/**
 * Network trust snapshot: current observed network state for a single pipeline run.
 * All engines use this timestamp; no internal timestamps are introduced.
 */
export interface NetworkTrustSnapshot {
  readonly timestamp: number;
  readonly behavior_profiles: readonly NodeBehaviorProfile[];
  /** Optional prior trust states (e.g. from previous run). If omitted, recovery treats all as TRUSTED. */
  readonly existing_trust_states?: readonly NodeTrustState[];
}
