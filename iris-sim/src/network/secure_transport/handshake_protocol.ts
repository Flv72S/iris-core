import { randomUUID, createHash, sign as signFn, verify as verifyFn } from 'node:crypto';
import type { TlsContext } from './tls_context.js';
import type { CanonicalIdentityType } from '../../control_plane/identity/canonical_identity.js';
import { verifyNodeIdBinding } from './transport_identity.js';
import { enforceConnectionTrust, type TransportTrustEngineLike } from './transport_trust_enforcement.js';
import { validateX25519PublicKeyRaw } from './pfs_keys.js';

export interface HandshakeHello {
  nodeId: string;
  domainId?: string;

  canonicalIdentity: string;
  supportedCanonicalIdentities: string[];

  nonce: string;
  timestamp: number;

  /** Raw X25519 public key (32 bytes), base64. When present with {@link pfs}, enables ECDHE session keys. */
  ephemeralPublicKey?: string;
  /** Peer requests Perfect Forward Secrecy (PFS) using {@link ephemeralPublicKey}. */
  pfs?: boolean;
  /** 16F.X5.X6.HARDENING: Ed25519 signature (base64) over {@link buildPfsEphemeralSignatureHash} — optional on first flight; client proves ephemeral in {@link ChallengeResponse} once `sessionId` is known. */
  ephemeralSignature?: string;
}

export interface ChallengeResponse {
  signatureB64: string;
  nonce: string; // echoes peer nonce
  /** Optional ephemeral material (unused in current flow; server pub lives on {@link HandshakeServerHello}). */
  ephemeralPublicKey?: string;
  /** PFS: binds client ephemeral to long-term identity + `sessionId` (16F.X5.X6.HARDENING). */
  ephemeralSignature?: string;
}

export interface HandshakeServerHello {
  nodeId: string;
  domainId?: string;
  canonicalIdentity: string;
  supportedCanonicalIdentities: string[];
  nonce: string;
  timestamp: number;
  challengeResponse: ChallengeResponse;
  /** Server ephemeral X25519 public key (base64) when PFS is negotiated. */
  ephemeralPublicKey?: string;
  /** PFS: server proof of ephemeral possession (16F.X5.X6.HARDENING). */
  ephemeralSignature?: string;
}

export type HandshakeNow = () => number;

export function defaultNonce(): string {
  return randomUUID();
}

export function isTimestampFresh(args: { timestamp: number; now: number; maxSkewMs: number }): boolean {
  return Math.abs(args.now - args.timestamp) <= args.maxSkewMs;
}

export function deriveChallenge(args: { nonceA: string; nonceB: string }): string {
  // Deterministic challenge tuple.
  return createHash('sha256').update(`${args.nonceA}:${args.nonceB}`, 'utf8').digest('hex');
}

/** SHA-256 digest over bound ephemeral material (message bytes signed with Ed25519 identity key). */
export function buildPfsEphemeralSignatureHash(args: {
  ephemeralPublicKeyB64: string;
  nodeId: string;
  sessionId: string;
  timestamp: number;
}): Buffer {
  return createHash('sha256')
    .update(args.ephemeralPublicKeyB64, 'utf8')
    .update(args.nodeId, 'utf8')
    .update(args.sessionId, 'utf8')
    .update(String(args.timestamp), 'utf8')
    .digest();
}

export function signPfsEphemeralBinding(args: { privateKeyPem: string; hash: Buffer }): string {
  return signFn(null, args.hash, args.privateKeyPem).toString('base64');
}

export function verifyPfsEphemeralBinding(args: {
  publicKeyPem: string;
  hash: Buffer;
  signatureB64: string;
}): boolean {
  try {
    return verifyFn(null, args.hash, args.publicKeyPem, Buffer.from(args.signatureB64, 'base64'));
  } catch {
    return false;
  }
}

export function makeSignedChallengeResponse(args: {
  privateKeyPem: string;
  peerNonce: string;
  localNonce: string;
  pfsEphemeral?: {
    ephemeralPublicKeyB64: string;
    nodeId: string;
    sessionId: string;
    timestamp: number;
  };
}): ChallengeResponse {
  const challenge = deriveChallenge({ nonceA: args.localNonce, nonceB: args.peerNonce });
  const signatureB64 = signFn(null, Buffer.from(challenge, 'utf8'), args.privateKeyPem).toString('base64');
  const base: ChallengeResponse = { signatureB64, nonce: args.peerNonce };
  if (!args.pfsEphemeral) return base;
  const h = buildPfsEphemeralSignatureHash({
    ephemeralPublicKeyB64: args.pfsEphemeral.ephemeralPublicKeyB64,
    nodeId: args.pfsEphemeral.nodeId,
    sessionId: args.pfsEphemeral.sessionId,
    timestamp: args.pfsEphemeral.timestamp,
  });
  const ephemeralSignature = signPfsEphemeralBinding({ privateKeyPem: args.privateKeyPem, hash: h });
  return { ...base, ephemeralSignature };
}

export function verifySignedChallengeResponse(args: {
  publicKeyPem: string;
  response: Pick<ChallengeResponse, 'signatureB64'>;
  peerNonce: string;
  localNonce: string;
}): boolean {
  const challenge = deriveChallenge({ nonceA: args.localNonce, nonceB: args.peerNonce });
  const ok = verifyFn(null, Buffer.from(challenge, 'utf8'), args.publicKeyPem, Buffer.from(args.response.signatureB64, 'base64'));
  return ok;
}

export type HandshakeConfig = {
  maxSkewMs: number;
  acceptedCanonicalIdentity: CanonicalIdentityType;
  supportedCanonicalIdentities: CanonicalIdentityType[];
  canonicalIdentityString?: CanonicalIdentityType;
};

export function negotiateCanonicalIdentity(args: {
  remoteCanonicalIdentity: string;
  remoteSupported: string[];
  accepted: CanonicalIdentityType;
}): void {
  if (args.remoteCanonicalIdentity !== args.accepted) throw new Error('TRANSPORT_CANONICAL_IDENTITY_MISMATCH');
  if (!args.remoteSupported.includes(args.accepted)) throw new Error('TRANSPORT_CANONICAL_IDENTITY_MISMATCH');
}

export function buildHandshakeHello(args: {
  nodeId: string;
  domainId?: string;
  canonicalIdentity: CanonicalIdentityType;
  supportedCanonicalIdentities: CanonicalIdentityType[];
  nonce?: string;
  timestamp?: number;
  ephemeralPublicKey?: string;
  pfs?: boolean;
}): HandshakeHello {
  const now = Date.now();
  return Object.freeze({
    nodeId: args.nodeId,
    ...(args.domainId !== undefined ? { domainId: args.domainId } : {}),
    canonicalIdentity: args.canonicalIdentity,
    supportedCanonicalIdentities: args.supportedCanonicalIdentities,
    nonce: args.nonce ?? defaultNonce(),
    timestamp: args.timestamp ?? now,
    ...(args.ephemeralPublicKey !== undefined ? { ephemeralPublicKey: args.ephemeralPublicKey } : {}),
    ...(args.pfs !== undefined ? { pfs: args.pfs } : {}),
  });
}

/** Decode and strictly validate a base64 X25519 public key from a hello / rekey frame. */
export function parseEphemeralPublicKeyB64(b64: string): Buffer {
  const buf = Buffer.from(b64, 'base64');
  validateX25519PublicKeyRaw(buf);
  return buf;
}

export function verifyHandshakeHello(args: {
  hello: HandshakeHello;
  remoteTls: TlsContext;
  trustEngine: TransportTrustEngineLike;
  trustEnforcementDomainMissingPolicy: 'reject-if-missing';
  maxSkewMs: number;
  now: number;
  replayGuard: { isReplay(nodeId: string, nonce: string): boolean };
  acceptedCanonicalIdentity: CanonicalIdentityType;
}): void {
  // Derived identity binding using the peer TLS public key material.
  verifyNodeIdBinding({ claimedNodeId: args.hello.nodeId, tlsContext: args.remoteTls });

  const fresh = isTimestampFresh({ timestamp: args.hello.timestamp, now: args.now, maxSkewMs: args.maxSkewMs });
  if (!fresh) {
    const err = new Error('TRANSPORT_TIMESTAMP_INVALID');
    (err as any).code = 'TRANSPORT_TIMESTAMP_INVALID';
    throw err;
  }

  if (args.hello.domainId === undefined && args.trustEnforcementDomainMissingPolicy === 'reject-if-missing') {
    const err = new Error('UNTRUSTED_DOMAIN');
    (err as any).code = 'UNTRUSTED_DOMAIN';
    throw err;
  }

  // Replay nonce check
  if (args.replayGuard.isReplay(args.hello.nodeId, args.hello.nonce)) {
    const err = new Error('TRANSPORT_REPLAY_DETECTED');
    (err as any).code = 'TRANSPORT_REPLAY_DETECTED';
    throw err;
  }

  if (args.hello.pfs && !args.hello.ephemeralPublicKey) {
    const err = new Error('PFS_INVALID_PUBLIC_KEY');
    (err as any).code = 'PFS_INVALID_PUBLIC_KEY';
    throw err;
  }
  if (args.hello.ephemeralPublicKey !== undefined) {
    parseEphemeralPublicKeyB64(args.hello.ephemeralPublicKey);
  }

  // Canonical identity negotiation.
  if (args.hello.canonicalIdentity !== args.acceptedCanonicalIdentity) {
    const err = new Error('TRANSPORT_CANONICAL_IDENTITY_MISMATCH');
    (err as any).code = 'TRANSPORT_CANONICAL_IDENTITY_MISMATCH';
    throw err;
  }
  if (!args.hello.supportedCanonicalIdentities.includes(args.acceptedCanonicalIdentity)) {
    const err = new Error('TRANSPORT_CANONICAL_IDENTITY_MISMATCH');
    (err as any).code = 'TRANSPORT_CANONICAL_IDENTITY_MISMATCH';
    throw err;
  }

  // Trust enforcement
  enforceConnectionTrust({
    trustEngine: args.trustEngine,
    peerNodeId: args.hello.nodeId,
    ...(args.hello.domainId !== undefined ? { peerDomainId: args.hello.domainId } : {}),
  });
}

