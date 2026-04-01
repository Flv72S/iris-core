/**
 * Phase 13XX-E — Governance Decision Engine. Core engine.
 */

import type { NodePassport } from '../node_passport/index.js';
import type { AnomalyEvent } from '../anomaly_detection/index.js';
import type { GovernanceDecision } from './governance_types.js';
import type { GovernancePolicyRegistry } from './governance_policy_registry.js';

/**
 * Evaluates all policies in order; returns collected decisions. Deterministic.
 */
export class GovernanceDecisionEngine {
  constructor(private readonly policyRegistry: GovernancePolicyRegistry) {}

  evaluateNode(
    passport: NodePassport,
    anomalies: readonly AnomalyEvent[],
    timestamp: number
  ): GovernanceDecision[] {
    const decisions: GovernanceDecision[] = [];
    const policies = this.policyRegistry.listPolicies();
    for (const policy of policies) {
      const decision = policy.evaluate(passport, anomalies, timestamp);
      if (decision != null) {
        decisions.push(Object.freeze(decision));
      }
    }
    return decisions;
  }
}
