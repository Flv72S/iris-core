/**
 * Microstep 14S — Trust & Verification Layer. Signer.
 */

import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';
import type { CryptoProvider } from './trust_crypto.js';
import type { SignedRecordEnvelope } from './trust_types.js';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]));
  return '{' + parts.join(',') + '}';
}

/** Deterministic serialization for signing scope (deep sorted keys). */
export function serializeSigningScopeDeterministic(value: unknown): string {
  return stableStringify(value);
}

/** Deterministic record serialization for signing (deep sorted keys). */
export function serializeRecordDeterministic(record: CovenantPersistenceRecord): string {
  return stableStringify(record);
}

export class TrustSigner {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly privateKey: string,
    private readonly publicKey: string,
    private readonly node_id: string,
    private readonly key_id: string = 'default',
  ) {}

  sign(record: CovenantPersistenceRecord, opts?: { signedAt?: number }): SignedRecordEnvelope {
    const serialized = serializeRecordDeterministic(record);
    const record_hash = this.crypto.hash(serialized);
    const signed_at = opts?.signedAt ?? Date.now();
    const signingScope = serializeSigningScopeDeterministic({
      record_hash,
      node_id: this.node_id,
      key_id: this.key_id,
      signed_at,
    });
    const scope_hash = this.crypto.hash(signingScope);
    const signature = this.crypto.sign(scope_hash, this.privateKey);
    return Object.freeze({
      record,
      signature,
      public_key: this.publicKey,
      key_id: this.key_id,
      node_id: this.node_id,
      signed_at,
      record_hash,
    });
  }
}

