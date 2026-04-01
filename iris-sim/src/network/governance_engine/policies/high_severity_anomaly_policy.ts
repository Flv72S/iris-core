/**
 * Phase 13XX-E — Example policy: Critical anomaly → SUSPEND_NODE.
 * Timestamp injected externally (decided_at).
 */

import type { NodePassport } from '../../node_passport/index.js';
import type { AnomalyEvent } from '../../anomaly_detection/index.js';
import type { GovernancePolicy } from '../governance_policy.js';
import type { GovernanceDecision } from '../governance_types.js';

export class HighSeverityAnomalyPolicy implements GovernancePolicy {
  readonly id = 'high_severity_anomaly_policy';

  evaluate(
    passport: NodePassport,
    anomalies: readonly AnomalyEvent[],
    decided_at: number
  ): GovernanceDecision | null {
    const critical = anomalies.find((a) => a.severity === 'CRITICAL');
    if (critical == null) return null;
    return {
      node_id: passport.node_id,
      action: 'SUSPEND_NODE',
      reason: 'Critical anomaly detected',
      severity: 'CRITICAL',
      decided_at,
    };
  }
}
