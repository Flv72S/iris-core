/**
 * Step 10C — Cross-Node Governance Verification Engine. Node identity validation.
 */

import type { IRISNodeIdentity } from '../../node_identity/types/iris_node_identity_types.js';
import { verifyIRISNodeIdentity } from '../../node_identity/verify/iris_node_identity_verifier.js';

/**
 * Validate issuing node identity by checking integrity and identity_hash.
 * Uses Node Identity Engine verifier with input derived from the identity.
 */
export function validateIssuingNodeIdentity(
  identity: IRISNodeIdentity
): boolean {
  const input = {
    metadata: identity.metadata,
    public_key: identity.public_key,
  };
  return verifyIRISNodeIdentity(input, identity);
}
