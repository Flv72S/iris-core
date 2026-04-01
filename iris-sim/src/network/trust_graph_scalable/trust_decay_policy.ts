/**
 * Phase 13XX-B — Adaptive Trust Propagation Decay. Policy provider.
 * Compatible with governance control via policy; can be wired to TrustPolicyRegistry.
 */

import type { TrustDecayPolicy } from './trust_decay_types.js';
import { DEFAULT_TRUST_DECAY_POLICY } from './trust_decay_types.js';
import type { TrustGraphPolicy } from '../trust_policy/index.js';

/** Extended trust graph policy with optional adaptive decay (governance-controlled). */
export interface TrustGraphPolicyWithDecay extends TrustGraphPolicy {
  readonly adaptive_decay?: TrustDecayPolicy;
}

/**
 * Provides the active trust decay policy. When used with TrustPolicyRegistry,
 * pass registry.getPolicy().trust_graph and ensure trust_graph has optional adaptive_decay.
 */
export class TrustDecayPolicyProvider {
  private readonly policy: TrustDecayPolicy;

  constructor(source?: TrustDecayPolicy | TrustGraphPolicyWithDecay) {
    if (source && 'adaptive_decay' in source && source.adaptive_decay != null) {
      this.policy = source.adaptive_decay;
    } else if (source && 'base_decay_factor' in source && typeof source.base_decay_factor === 'number') {
      this.policy = source as TrustDecayPolicy;
    } else {
      this.policy = DEFAULT_TRUST_DECAY_POLICY;
    }
  }

  getPolicy(): TrustDecayPolicy {
    return this.policy;
  }
}
