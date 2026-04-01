/**
 * Phase 13XX-J — Cross-Network Trust Policies. Main integration service.
 */

import type { PolicyRegistry } from './policy_registry.js';
import type { PolicyEvaluator } from './policy_evaluator.js';

export class PolicyService {
  constructor(
    private readonly registry: PolicyRegistry,
    private readonly evaluator: PolicyEvaluator
  ) {}

  getRegistry(): PolicyRegistry {
    return this.registry;
  }

  /**
   * Evaluate trust transfer across domains (e.g. for Trust Engine).
   * Returns effective trust value after policy application.
   */
  evaluateTrustTransfer(
    source_domain: string,
    target_domain: string,
    trust_value: number
  ): number {
    return this.evaluator.evaluatePropagation(source_domain, target_domain, trust_value);
  }

  /**
   * Validate whether interaction from source_domain to target_domain is allowed.
   * Used by Trust Engine, Governance Engine, Trust Bridges.
   */
  validateInteraction(source_domain: string, target_domain: string): boolean {
    return this.evaluator.isInteractionAllowed(source_domain, target_domain);
  }
}
