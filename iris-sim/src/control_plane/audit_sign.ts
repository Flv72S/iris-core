/**
 * Audit record signatures cover stable JSON of the record body only.
 * Node identity for trust/sync uses `identity/node_identity` (SPKI DER canonicalization), not raw PEM hashing here.
 */
import { stableStringify } from '../security/stable_json.js';
import { signPayload, verifySignature } from '../security/hmac.js';
import type { TrustAuditRecord } from './audit_types.js';
import type { KeyProvider } from './keys/key_types.js';

export function signAuditRecord(record: Omit<TrustAuditRecord, 'signature'>, secret: string): string {
  return signPayload(secret, stableStringify(record));
}

export function verifyAuditRecordSignature(record: TrustAuditRecord, secret: string): boolean {
  if (!record.signature) return false;
  const { signature, ...rest } = record;
  return verifySignature(secret, stableStringify(rest), signature);
}

/** Audit signing key isolated from protocol (Ed25519 or HMAC via provider). */
export function signAuditRecordWithProviderSync(
  record: Omit<TrustAuditRecord, 'signature'>,
  provider: KeyProvider,
): string {
  if (!provider.signSync) {
    throw new Error('AUDIT_SIGN_SYNC_UNAVAILABLE: KeyProvider must expose signSync for audit path');
  }
  return provider.signSync('audit_signing', stableStringify(record));
}

export async function signAuditRecordAsync(
  record: Omit<TrustAuditRecord, 'signature'>,
  provider: KeyProvider,
): Promise<string> {
  return provider.sign('audit_signing', stableStringify(record));
}
