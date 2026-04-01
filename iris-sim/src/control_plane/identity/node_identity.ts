import { canonicalizePublicKey, deriveNodeIdFromDer } from './key_canonicalization.js';

/**
 * Node identity is derived from a CANONICAL binary representation of the public key.
 *
 * IMPORTANT:
 * - PEM formatting differences MUST NOT affect nodeId
 * - Identity is based on DER (SPKI) encoding
 * - This guarantees cross-system deterministic identity
 *
 * Algorithm: PEM → parse → SPKI DER → SHA-256 hex of UTF-8(DER as lowercase hex string).
 */
export function deriveNodeId(publicKey: string): string {
  try {
    const canonical = canonicalizePublicKey(publicKey);
    return deriveNodeIdFromDer(canonical);
  } catch {
    throw new Error('IDENTITY_DERIVATION_FAILED');
  }
}
