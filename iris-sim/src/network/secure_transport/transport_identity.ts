import { createHash, createPublicKey, sign as signFn, verify as verifySig } from 'node:crypto';
import type { TlsContext } from './tls_context.js';
import type { CanonicalIdentityType } from '../../control_plane/identity/canonical_identity.js';

export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function canonicalPublicKeyDerFromPem(publicKeyPem: string): Buffer {
  const keyObj = createPublicKey(publicKeyPem);
  // We treat SPKI DER as canonical material for `spki_der_v1`.
  const der = keyObj.export({ type: 'spki', format: 'der' }) as Buffer;
  return der;
}

/**
 * Critical rule from 16F.X5: derivedNodeId = sha256(canonicalPublicKeyDer).
 */
export function deriveNodeIdFromCanonicalPublicKeyDer(canonicalDer: Buffer): string {
  return sha256Hex(canonicalDer);
}

export function deriveNodeIdFromTlsContext(ctx: TlsContext): string {
  const der = canonicalPublicKeyDerFromPem(ctx.publicKeyPem);
  return deriveNodeIdFromCanonicalPublicKeyDer(der);
}

export function verifyNodeIdBinding(args: {
  claimedNodeId: string;
  tlsContext: TlsContext;
}): void {
  const derived = deriveNodeIdFromTlsContext(args.tlsContext);
  if (derived !== args.claimedNodeId) {
    const err = new Error('TRANSPORT_IDENTITY_MISMATCH');
    (err as any).code = 'TRANSPORT_IDENTITY_MISMATCH';
    throw err;
  }
}

export function verifyCanonicalIdentity(args: {
  canonicalIdentity: CanonicalIdentityType;
  supportedCanonicalIdentities: CanonicalIdentityType[];
  acceptedIdentity: CanonicalIdentityType;
}): void {
  const okNegotiation =
    args.supportedCanonicalIdentities.includes(args.canonicalIdentity) && args.canonicalIdentity === args.acceptedIdentity;
  if (!okNegotiation) {
    const err = new Error('TRANSPORT_CANONICAL_IDENTITY_MISMATCH');
    (err as any).code = 'TRANSPORT_CANONICAL_IDENTITY_MISMATCH';
    throw err;
  }
}

export function signHandshakeChallenge(args: {
  privateKeyPem: string;
  challenge: string;
}): string {
  return signFn(null, Buffer.from(args.challenge, 'utf8'), args.privateKeyPem).toString('base64');
}

export function verifyHandshakeChallenge(args: {
  publicKeyPem: string;
  challenge: string;
  signatureB64: string;
}): boolean {
  const ok = verifySig(null, Buffer.from(args.challenge, 'utf8'), args.publicKeyPem, Buffer.from(args.signatureB64, 'base64'));
  return ok;
}

