/**
 * Phase 13XX-F — Trust Explainability Engine. Node Explainability Service.
 * Aggregates trust, anomaly, and governance explanations. Read-only; deterministic.
 */

import type { NodePassport } from '../node_passport/index.js';
import type { AnomalyEvent } from '../anomaly_detection/index.js';
import type { GovernanceDecision } from '../governance_engine/index.js';
import type { TrustExplanation, ExplanationFactor } from './explainability_types.js';
import type { TrustExplainer } from './trust_explainer.js';
import type { AnomalyExplainer } from './anomaly_explainer_13xx.js';
import type { GovernanceExplainer } from './governance_explainer.js';

export class NodeExplainabilityService {
  constructor(
    private readonly trustExplainer: TrustExplainer,
    private readonly anomalyExplainer: AnomalyExplainer,
    private readonly governanceExplainer: GovernanceExplainer
  ) {}

  explainNode(
    passport: NodePassport,
    anomalies: readonly AnomalyEvent[],
    decisions: readonly GovernanceDecision[]
  ): TrustExplanation {
    const trustFactors = this.trustExplainer.explainTrust(passport);
    const anomalyFactors = this.anomalyExplainer.explainAnomalies(anomalies);
    const governanceFactors = this.governanceExplainer.explainGovernance(decisions);
    const factors: ExplanationFactor[] = [
      ...trustFactors,
      ...anomalyFactors,
      ...governanceFactors,
    ];
    const summary = buildSummary(passport, anomalyFactors.length, governanceFactors.length);
    return Object.freeze({
      node_id: passport.node_id,
      trust_score: passport.trust_score,
      reputation_score: passport.reputation_score,
      anomaly_count: passport.anomaly_count,
      governance_flags: [...passport.governance_flags],
      summary,
      factors: Object.freeze(factors),
    });
  }
}

function buildSummary(
  passport: NodePassport,
  anomalyFactorCount: number,
  governanceFactorCount: number
): string {
  const parts: string[] = [];
  if (passport.trust_score < 0.5) {
    parts.push('Trust reduced');
  }
  if (anomalyFactorCount > 0) {
    parts.push(`${passport.anomaly_count} anomaly event(s) detected`);
  }
  if (governanceFactorCount > 0 || passport.governance_flags.length > 0) {
    parts.push('Governance review active');
  }
  if (parts.length === 0) {
    return 'No significant trust factors.';
  }
  return parts.join('. ') + '.';
}
