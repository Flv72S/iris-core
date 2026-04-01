import type { KeyProvider } from './key_types.js';

export type CompositeVerifyContext = {
  /** When set, verify Ed25519 with this public key. */
  peerPublicKey?: string;
  /** When peer has no public key, verify HMAC with this secret. */
  legacySecret?: string;
};

/**
 * Verification helper: prefer asymmetric when `peerPublicKey` is set, else HMAC legacy.
 */
export async function verifyWithCompositeStrategy(
  primary: KeyProvider,
  payload: string,
  signature: string,
  ctx: CompositeVerifyContext,
): Promise<boolean> {
  if (ctx.peerPublicKey && ctx.peerPublicKey.length > 0) {
    return primary.verify(ctx.peerPublicKey, payload, signature);
  }
  if (ctx.legacySecret) {
    const { verifySignature } = await import('../../security/hmac.js');
    return verifySignature(ctx.legacySecret, payload, signature);
  }
  return false;
}
