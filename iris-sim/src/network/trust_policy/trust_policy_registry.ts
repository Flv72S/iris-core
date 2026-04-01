/**
 * Phase 13L — Trust Policy Configuration System. Central registry.
 */

import type { TrustPolicyConfig } from './trust_policy_types.js';
import { DEFAULT_TRUST_POLICY } from './trust_policy_schema.js';
import { validateTrustPolicy } from './trust_policy_validator.js';

/**
 * Central registry for the active trust policy. Only validated policies may be loaded.
 * Policy updates are versioned via the policy's version and timestamp fields.
 * The registry always holds a valid policy (default on construction).
 */
export class TrustPolicyRegistry {
  private current_policy: TrustPolicyConfig;

  constructor() {
    this.current_policy = DEFAULT_TRUST_POLICY;
  }

  /**
   * Return the current active policy. Read-only; safe to use during pipeline execution.
   */
  getPolicy(): TrustPolicyConfig {
    return this.current_policy;
  }

  /**
   * Update the active policy. Only validated policies are accepted; otherwise throws.
   */
  updatePolicy(new_policy: TrustPolicyConfig): void {
    validateTrustPolicy(new_policy);
    this.current_policy = new_policy;
  }
}
