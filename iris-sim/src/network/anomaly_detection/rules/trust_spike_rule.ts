/**
 * Phase 13XX-D — Example rule: Trust Spike Detection.
 * Deterministic; timestamp from context.
 */

import type { AnomalyRule } from '../anomaly_rule.js';
import type { AnomalyContext } from '../anomaly_rule.js';
import type { AnomalyEvent } from '../anomaly_event.js';

const SPIKE_THRESHOLD = 0.4;

export class TrustSpikeRule implements AnomalyRule {
  readonly id = 'trust_spike_rule';
  readonly anomaly_type = 'TRUST_SPIKE';

  evaluate(context: AnomalyContext): AnomalyEvent | null {
    const prev = context.previous_trust_score;
    if (prev == null) return null;
    const delta = context.trust_score - prev;
    if (delta > SPIKE_THRESHOLD) {
      return {
        node_id: context.node_id,
        anomaly_type: 'TRUST_SPIKE',
        severity: 'MEDIUM',
        description: 'Unexpected trust increase',
        detected_at: context.detected_at,
      };
    }
    return null;
  }
}
