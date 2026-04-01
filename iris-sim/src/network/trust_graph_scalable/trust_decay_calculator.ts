/**
 * Phase 13XX-B — Adaptive Trust Propagation Decay. Calculator.
 * O(1) per call; deterministic; policy-driven only.
 */

import type { TrustDecayPolicyProvider } from './trust_decay_policy.js';
import { DEFAULT_NODE_TYPE_DECAY } from './trust_decay_types.js';

export interface TrustDecayCalculatorOptions {
  /** Called when decay is computed for a node type (observability). */
  onDecayUsage?: (node_type: string) => void;
}

/**
 * Computes effective decay factor for a node type.
 * effective_decay = base_decay_factor × node_type_modifier
 * Fallback: if node_type is missing from policy, use base_decay_factor × 1.0.
 */
export class TrustDecayCalculator {
  constructor(
    private readonly policyProvider: TrustDecayPolicyProvider,
    private readonly options: TrustDecayCalculatorOptions = {}
  ) {}

  /**
   * Returns base × node_type_modifier. O(1). Deterministic.
   */
  computeDecayFactor(node_type: string): number {
    const policy = this.policyProvider.getPolicy();
    const modifier = policy.node_type_decay[node_type] ?? DEFAULT_NODE_TYPE_DECAY[node_type] ?? 1.0;
    const effective = policy.base_decay_factor * modifier;
    this.options.onDecayUsage?.(node_type);
    return effective;
  }

  /** Default decay when node identity is missing (base only, no modifier). */
  getDefaultDecayFactor(): number {
    return this.policyProvider.getPolicy().base_decay_factor;
  }
}
