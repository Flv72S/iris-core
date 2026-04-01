/**
 * Phase 13XX-D — Multi-Layer Anomaly Detection. Immutable event.
 */

import type { RuleAnomalyType, AnomalySeverity } from './anomaly_types.js';

export interface AnomalyEvent {
  readonly node_id: string;
  readonly anomaly_type: RuleAnomalyType;
  readonly severity: AnomalySeverity;
  readonly description: string;
  readonly detected_at: number;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export function freezeAnomalyEvent(e: AnomalyEvent): AnomalyEvent {
  return Object.freeze({
    ...e,
    ...(e.metadata != null && { metadata: Object.freeze(e.metadata) }),
  });
}
