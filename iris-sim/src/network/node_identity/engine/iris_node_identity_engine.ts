/**
 * Step 10A — IRIS Node Identity Engine.
 */

import { createHash } from 'node:crypto';
import type {
  IRISNodeIdentityInput,
  IRISNodeIdentity,
  IRISNodeMetadata,
} from '../types/iris_node_identity_types.js';
import { computeNodeIdentityHash } from '../hashing/iris_node_identity_hash.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Derive deterministic node_id from public_key and metadata (node_name, organization).
 * Format: iris-node-<sha256 hex>
 */
function deriveNodeId(
  public_key: string,
  metadata: Pick<IRISNodeMetadata, 'node_name' | 'organization'>
): string {
  const payload = public_key + metadata.node_name + metadata.organization;
  const hash = sha256Hex(payload);
  return 'iris-node-' + hash;
}

/**
 * Generate IRIS node identity from metadata and public key.
 * Deterministic: same input → same identity.
 */
export function generateIRISNodeIdentity(
  input: IRISNodeIdentityInput
): IRISNodeIdentity {
  const node_id = deriveNodeId(input.public_key, input.metadata);
  const identityWithoutHash: IRISNodeIdentity = {
    node_id,
    public_key: input.public_key,
    metadata: input.metadata,
    identity_hash: '', // set below
  };
  const identity_hash = computeNodeIdentityHash(identityWithoutHash);
  return Object.freeze({
    ...identityWithoutHash,
    identity_hash,
  });
}
