/**
 * Phase 13XX-D — Multi-Layer Anomaly Detection. Rule interface and context.
 */

import type { RuleAnomalyType } from './anomaly_types.js';
import type { AnomalyEvent } from './anomaly_event.js';

/** Context provided by the trust engine; timestamps passed in for determinism. */
export interface AnomalyContext {
  readonly node_id: string;
  readonly trust_score: number;
  readonly previous_trust_score?: number | undefined;
  readonly propagation_depth?: number | undefined;
  readonly node_type?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  /** Timestamp for detection (injected externally; no Date.now()). */
  readonly detected_at: number;
}

/** Deterministic rule: evaluate context and return an event or null. No ML, no randomness. */
export interface AnomalyRule {
  readonly id: string;
  readonly anomaly_type: RuleAnomalyType;
  evaluate(context: AnomalyContext): AnomalyEvent | null;
}
