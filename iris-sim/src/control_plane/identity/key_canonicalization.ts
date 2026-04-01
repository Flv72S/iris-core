import { createHash, createPublicKey } from 'node:crypto';

import { sha256 } from '../crypto/hash.js';

/** Parse / export failures (malformed PEM, unsupported encoding). */
export type CanonicalizeFailureCode = 'INVALID_PUBLIC_KEY_FORMAT' | 'PUBLIC_KEY_CANONICALIZATION_FAILED';

const MAX_CACHE = 512;
const derByPemInput = new Map<string, Buffer>();

function cacheGet(pemInput: string): Buffer | undefined {
  const hit = derByPemInput.get(pemInput);
  return hit ? Buffer.from(hit) : undefined;
}

function cacheSet(pemInput: string, der: Buffer): void {
  if (derByPemInput.size >= MAX_CACHE) {
    const first = derByPemInput.keys().next().value;
    if (first !== undefined) derByPemInput.delete(first);
  }
  derByPemInput.set(pemInput, Buffer.from(der));
}

/**
 * Parse PEM/DER public material and return canonical SPKI DER (Ed25519 only).
 * Equivalent keys in different PEM encodings yield identical buffers.
 */
export function tryCanonicalizePublicKey(
  pem: string,
): { ok: true; der: Buffer } | { ok: false; code: CanonicalizeFailureCode } {
  const input = pem.trim();
  if (!input) {
    return { ok: false, code: 'INVALID_PUBLIC_KEY_FORMAT' };
  }
  const cached = cacheGet(input);
  if (cached) {
    return { ok: true, der: cached };
  }
  try {
    const key = createPublicKey(input);
    if (key.asymmetricKeyType !== 'ed25519') {
      return { ok: false, code: 'INVALID_PUBLIC_KEY_FORMAT' };
    }
    const der = key.export({ type: 'spki', format: 'der' }) as Buffer;
    cacheSet(input, der);
    return { ok: true, der: Buffer.from(der) };
  } catch {
    return { ok: false, code: 'PUBLIC_KEY_CANONICALIZATION_FAILED' };
  }
}

/**
 * Canonical SPKI DER for an Ed25519 public key.
 * @throws Error with message `INVALID_PUBLIC_KEY_FORMAT` or `PUBLIC_KEY_CANONICALIZATION_FAILED`
 */
export function canonicalizePublicKey(pem: string): Buffer {
  const r = tryCanonicalizePublicKey(pem);
  if (!r.ok) {
    throw new Error(r.code);
  }
  return r.der;
}

/** SHA-256 hex digest of raw SPKI DER (logs / fingerprint). */
export function publicKeyDerFingerprint(pem: string): string {
  const der = canonicalizePublicKey(pem);
  return createHash('sha256').update(der).digest('hex');
}

/** Node id: SHA-256 hex of UTF-8 encoding of DER hex string (spec 16F.X1.X2.HARDENING). */
export function deriveNodeIdFromDer(der: Buffer): string {
  return sha256(der.toString('hex'));
}
