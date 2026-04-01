/**
 * Phase 13XX-F — Trust Explainability Engine. Governance Explainer.
 * Read-only; explains GovernanceDecision[] (policy id not in decision; we use action + reason).
 */

import type { GovernanceDecision } from '../governance_engine/index.js';
import type { ExplanationFactor } from './explainability_types.js';

export class GovernanceExplainer {
  explainGovernance(decisions: readonly GovernanceDecision[]): ExplanationFactor[] {
    const factors: ExplanationFactor[] = [];
    for (const d of decisions) {
      factors.push({
        type: 'GOVERNANCE_DECISION',
        description: `${d.action}: ${d.reason}. Severity: ${d.severity}.`,
      });
    }
    return factors;
  }
}
