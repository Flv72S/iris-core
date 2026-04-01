/**
 * Phase 13XX-B — Adaptive Trust Propagation Decay. Types.
 *
 * effective_decay = base_decay_factor × node_type_modifier
 */

export interface TrustDecayPolicy {
  readonly base_decay_factor: number;
  readonly node_type_decay: Readonly<Record<string, number>>;
}

/** Default node-type modifiers (multipliers for base_decay_factor). */
export const DEFAULT_NODE_TYPE_DECAY: Readonly<Record<string, number>> = Object.freeze({
  HUMAN: 1.0,
  INTERNAL_SERVICE: 1.05,
  MICROSERVICE: 1.0,
  THIRD_PARTY_AI: 0.85,
  IOT_DEVICE: 0.75,
  AUTONOMOUS_AGENT: 0.8,
});

/** Example configuration: base 0.9 with node-type modifiers. */
export const DEFAULT_TRUST_DECAY_POLICY: TrustDecayPolicy = Object.freeze({
  base_decay_factor: 0.9,
  node_type_decay: DEFAULT_NODE_TYPE_DECAY,
});
