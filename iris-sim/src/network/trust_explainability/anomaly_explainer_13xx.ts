/**
 * Phase 13XX-F — Trust Explainability Engine. Anomaly Explainer (rule-based events).
 * Read-only; describes AnomalyEvent[] from Phase 13XX-D.
 */

import type { AnomalyEvent } from '../anomaly_detection/index.js';
import type { ExplanationFactor } from './explainability_types.js';

export class AnomalyExplainer {
  explainAnomalies(anomalies: readonly AnomalyEvent[]): ExplanationFactor[] {
    const factors: ExplanationFactor[] = [];
    for (const a of anomalies) {
      factors.push({
        type: 'ANOMALY_EVENT',
        description: `${a.anomaly_type}: ${a.description}. Severity: ${a.severity}.`,
        weight: a.severity === 'CRITICAL' ? 1 : a.severity === 'HIGH' ? 0.8 : a.severity === 'MEDIUM' ? 0.5 : 0.3,
      });
    }
    return factors;
  }
}
