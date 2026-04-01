/**
 * Step 10A — IRIS Node Identity Engine. Verifier.
 */

import type {
  IRISNodeIdentityInput,
  IRISNodeIdentity,
} from '../types/iris_node_identity_types.js';
import { generateIRISNodeIdentity } from '../engine/iris_node_identity_engine.js';

/**
 * Verify node identity by regenerating from input and comparing identity_hash and fields.
 */
export function verifyIRISNodeIdentity(
  input: IRISNodeIdentityInput,
  identity: IRISNodeIdentity
): boolean {
  try {
    const expected = generateIRISNodeIdentity(input);
    if (identity.identity_hash !== expected.identity_hash) return false;
    if (identity.node_id !== expected.node_id) return false;
    if (identity.public_key !== expected.public_key) return false;
    if (identity.metadata.node_name !== expected.metadata.node_name) return false;
    if (identity.metadata.organization !== expected.metadata.organization) return false;
    if (identity.metadata.deployment_environment !== expected.metadata.deployment_environment)
      return false;
    if (identity.metadata.geographic_region !== expected.metadata.geographic_region)
      return false;
    return true;
  } catch {
    return false;
  }
}
