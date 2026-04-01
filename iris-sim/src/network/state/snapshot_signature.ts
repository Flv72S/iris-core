/**
 * Phase 14B — Snapshot Engine. Optional snapshot signing (HMAC-SHA256).
 * For verification with NodeIdentity public_key use the same key for sign and verify.
 */

import { createHmac } from 'node:crypto';

function hmacSha256Hex(key: string, data: string): string {
  return createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

export class SnapshotSignature {
  /**
   * Sign snapshot payload. Key is signing secret (or node identity key).
   * Deterministic: same payload + key → same signature.
   */
  static sign(snapshot_payload: string, signing_key: string): string {
    return hmacSha256Hex(signing_key, snapshot_payload);
  }

  /**
   * Verify signature. Use same key as sign (e.g. NodeIdentity public_key as HMAC key).
   */
  static verify(
    snapshot_payload: string,
    signature: string,
    public_key: string
  ): boolean {
    const expected = hmacSha256Hex(public_key, snapshot_payload);
    return expected === signature && signature.length > 0;
  }
}
