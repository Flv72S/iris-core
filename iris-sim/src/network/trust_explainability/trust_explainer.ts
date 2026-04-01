/**
 * Phase 13XX-F — Trust Explainability Engine. Trust Explainer.
 * Read-only; analyzes trust_score, reputation_score, governance_flags.
 */

import type { NodePassport } from '../node_passport/index.js';
import type { ExplanationFactor } from './explainability_types.js';

export class TrustExplainer {
  explainTrust(passport: NodePassport): ExplanationFactor[] {
    const factors: ExplanationFactor[] = [];
    factors.push({
      type: 'TRUST_PROPAGATION',
      description: `Trust score: ${passport.trust_score.toFixed(2)}. Reputation score: ${passport.reputation_score.toFixed(2)}.`,
      weight: passport.trust_score,
    });
    if (passport.trust_score < 0.5) {
      factors.push({
        type: 'TRUST_DECAY',
        description: 'Trust below 0.5; passive trust decay or negative signals applied.',
      });
    }
    if (passport.governance_flags.length > 0) {
      factors.push({
        type: 'GOVERNANCE_DECISION',
        description: `Governance flags active: ${passport.governance_flags.join(', ')}.`,
      });
    }
    return factors;
  }
}
