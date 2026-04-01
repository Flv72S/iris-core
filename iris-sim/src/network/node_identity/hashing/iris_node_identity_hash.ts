/**
 * Step 10A — IRIS Node Identity Engine. Deterministic identity hash.
 */

import { hashObjectDeterministic } from '../../../governance/cryptographic_proof/hashing/governance_hash.js';
import type { IRISNodeIdentity } from '../types/iris_node_identity_types.js';

/**
 * Compute deterministic hash of node identity (node_id, public_key, metadata).
 * Does not include identity_hash in the hashed payload.
 */
export function computeNodeIdentityHash(identity: IRISNodeIdentity): string {
  return hashObjectDeterministic({
    node_id: identity.node_id,
    public_key: identity.public_key,
    metadata: identity.metadata,
  });
}
