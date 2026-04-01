/**
 * Phase 13XX-J — Cross-Network Trust Policies. Deterministic policy evaluator.
 */

import type { PolicyRegistry } from './policy_registry.js';
import { PARAM_CROSS_NETWORK_WEIGHT, PARAM_INTERACTION_ALLOWED } from './trust_policy.js';

const TRUST_MIN = 0;
const TRUST_MAX = 1;

function clampTrust(value: number): number {
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, value));
}

function getNumberParam(params: Readonly<Record<string, unknown>>, key: string): number | null {
  const v = params[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function getBooleanParam(params: Readonly<Record<string, unknown>>, key: string): boolean | null {
  const v = params[key];
  if (typeof v !== 'boolean') return null;
  return v;
}

export class PolicyEvaluator {
  constructor(private readonly registry: PolicyRegistry) {}

  /**
   * Evaluate trust transfer from source_domain to target_domain.
   * Applies cross_network_weight and interaction rules. Deterministic.
   */
  evaluatePropagation(
    source_domain: string,
    target_domain: string,
    trust_value: number
  ): number {
    if (!this.isInteractionAllowed(source_domain, target_domain)) return 0;
    const policies = this.registry.getPoliciesForDomains(source_domain, target_domain);
    let value = clampTrust(trust_value);
    for (const p of policies) {
      if (p.policy_type === 'CROSS_NETWORK_WEIGHT') {
        const w = getNumberParam(p.parameters, PARAM_CROSS_NETWORK_WEIGHT);
        if (w !== null && w >= 0) value *= w;
      }
    }
    return clampTrust(value);
  }

  /**
   * Whether trust interaction from source_domain to target_domain is allowed.
   */
  isInteractionAllowed(source_domain: string, target_domain: string): boolean {
    const policies = this.registry.getPoliciesForDomains(source_domain, target_domain);
    for (const p of policies) {
      if (p.policy_type === 'DOMAIN_INTERACTION_RULE') {
        const allowed = getBooleanParam(p.parameters, PARAM_INTERACTION_ALLOWED);
        if (allowed === false) return false;
      }
    }
    return true;
  }
}
