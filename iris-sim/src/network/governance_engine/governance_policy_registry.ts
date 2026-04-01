/**
 * Phase 13XX-E — Governance Decision Engine. Policy registry.
 */

import type { GovernancePolicy } from './governance_policy.js';

export class GovernancePolicyRegistry {
  private readonly policies: GovernancePolicy[] = [];

  registerPolicy(policy: GovernancePolicy): void {
    if (this.policies.some((p) => p.id === policy.id)) return;
    this.policies.push(policy);
  }

  listPolicies(): GovernancePolicy[] {
    return [...this.policies];
  }
}
