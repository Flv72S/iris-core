/**
 * Microstep 14S — Trust & Verification Layer. Verifier.
 */

import type { CryptoProvider } from './trust_crypto.js';
import type { SignedRecordEnvelope } from './trust_types.js';
import { serializeRecordDeterministic, serializeSigningScopeDeterministic } from './trust_signer.js';

export class TrustVerifier {
  constructor(private readonly crypto: CryptoProvider) {}

  computeRecordHash(record: SignedRecordEnvelope['record']): string {
    const serialized = serializeRecordDeterministic(record);
    return this.crypto.hash(serialized);
  }

  verify(envelope: SignedRecordEnvelope): boolean {
    const record_hash = this.computeRecordHash(envelope.record);
    const key_id = envelope.key_id ?? 'legacy';
    const signed_at = envelope.signed_at;
    const signingScope = serializeSigningScopeDeterministic({
      record_hash,
      node_id: envelope.node_id,
      key_id,
      signed_at,
    });
    const scope_hash = this.crypto.hash(signingScope);
    if (!envelope.public_key) return false;
    return this.crypto.verify(scope_hash, envelope.signature, envelope.public_key);
  }
}

