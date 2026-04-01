/**
 * Step 8J — Governance Trust Anchor. Types for root-of-trust signatures.
 */

export interface GovernanceSignature {
  readonly signature: string;
  readonly algorithm: string;
  readonly key_id: string;
  readonly timestamp: number;
}

export interface IRISRootKey {
  readonly key_id: string;
  readonly algorithm: string;
  readonly public_key_hash: string;
}
