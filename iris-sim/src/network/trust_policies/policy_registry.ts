/**
 * Phase 13XX-J — Cross-Network Trust Policies. Policy registry.
 */

import type { TrustPolicy } from './trust_policy.js';

export class PolicyRegistry {
  private readonly byId = new Map<string, TrustPolicy>();

  registerPolicy(policy: TrustPolicy): void {
    this.byId.set(policy.policy_id, policy);
  }

  getPolicy(policy_id: string): TrustPolicy | null {
    return this.byId.get(policy_id) ?? null;
  }

  listPolicies(): TrustPolicy[] {
    return [...this.byId.values()];
  }

  getPoliciesForDomains(source_domain: string, target_domain: string): TrustPolicy[] {
    return this.listPolicies().filter(
      (p) => p.source_domain === source_domain && p.target_domain === target_domain
    );
  }
}
