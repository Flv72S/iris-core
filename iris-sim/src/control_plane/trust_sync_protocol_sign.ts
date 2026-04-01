import { signPayload, verifySignature } from '../security/hmac.js';
import { stableStringify } from '../security/stable_json.js';
import { securityLog } from '../security/security_logger.js';
import { deriveNodeIdFromDer, tryCanonicalizePublicKey } from './identity/key_canonicalization.js';
import type { KeyProvider } from './keys/key_types.js';

function stripSignatureFields(o: Record<string, unknown>): Record<string, unknown> {
  const { signature: _sig, ...rest } = o;
  return rest;
}

function identityIdFromPayload(o: Record<string, unknown>): string | undefined {
  if (typeof o.requesterNodeId === 'string') return o.requesterNodeId;
  if (typeof o.responderNodeId === 'string') return o.responderNodeId;
  if (typeof o.nodeId === 'string') return o.nodeId;
  return undefined;
}

export function canonicalProtocolPayload(payload: object): string {
  return stableStringify(stripSignatureFields(payload as Record<string, unknown>));
}

export async function signProtocolMessage(payload: object, keyProvider: KeyProvider): Promise<string> {
  const canonical = canonicalProtocolPayload(payload);
  return keyProvider.sign('protocol_signing', canonical);
}

export type VerifyProtocolOptions = {
  legacySharedSecret?: string;
};

/**
 * Verifies protocol envelope: Ed25519 via keyProvider when `signerPublicKey` present,
 * else HMAC with `legacySharedSecret` (logs LEGACY_CRYPTO_MODE).
 */
export async function verifyProtocolMessage(
  payload: object,
  keyProvider: KeyProvider,
  options?: VerifyProtocolOptions,
): Promise<boolean> {
  const o = payload as Record<string, unknown>;
  const sig = o.signature;
  if (typeof sig !== 'string') return false;
  const canonical = canonicalProtocolPayload(payload);
  const signerPublicKey = o.signerPublicKey;

  if (typeof signerPublicKey === 'string' && signerPublicKey.length > 0) {
    const canon = tryCanonicalizePublicKey(signerPublicKey);
    if (!canon.ok) {
      const ev =
        canon.code === 'INVALID_PUBLIC_KEY_FORMAT'
          ? 'INVALID_PUBLIC_KEY_FORMAT'
          : 'PUBLIC_KEY_CANONICALIZATION_FAILED';
      securityLog(ev, { phase: 'protocol_verify' });
      return false;
    }
    const derived = deriveNodeIdFromDer(canon.der);
    const identityId = identityIdFromPayload(o);
    if (!identityId) return false;
    if (derived !== identityId) {
      securityLog('SYNC_IDENTITY_MISMATCH', { identityId, derived, signerPublicKey: signerPublicKey.slice(0, 32) });
      return false;
    }
    return keyProvider.verify(signerPublicKey, canonical, sig);
  }

  securityLog('LEGACY_CRYPTO_MODE', { phase: 'protocol_verify' });
  const legacy = options?.legacySharedSecret;
  if (!legacy) return false;
  return verifySignature(legacy, canonical, sig);
}

/** Synchronous HMAC signing for callers without async (legacy CLI). */
export function signProtocolMessageLegacySync(payload: object, secret: string): string {
  return signPayload(secret, canonicalProtocolPayload(payload));
}

export function verifyProtocolMessageLegacySync(payload: object, signature: string, secret: string): boolean {
  return verifySignature(secret, canonicalProtocolPayload(payload), signature);
}
