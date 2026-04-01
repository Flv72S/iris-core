/**
 * Step 8J — Governance Trust Anchor. Root of trust for IRIS governance.
 */

export type { GovernanceSignature, IRISRootKey } from './types/trust_anchor_types.js';
export { IRIS_ROOT_KEY_ID, IRIS_ROOT_PUBLIC_KEY_HASH } from './key/iris_root_key.js';
export { signGovernanceObject } from './sign/governance_signer.js';
export { verifyGovernanceSignature } from './verify/governance_signature_verifier.js';
export { TRUST_ANCHOR_REGISTRY } from './registry/trust_anchor_registry.js';
