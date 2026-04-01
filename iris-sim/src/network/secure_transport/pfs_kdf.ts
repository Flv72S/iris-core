import { createHash, hkdfSync } from 'node:crypto';

/**
 * Handshake KDF context: both node IDs, session id, and both X25519 ephemerals (base64).
 * Ephemeral strings are paired with their owning nodeId; pairs are sorted by nodeId (anti-reflection).
 */
export type PfsHandshakeKdfContext = {
  nodeIdA: string;
  nodeIdB: string;
  sessionId: string;
  ephemeralPublicKeyA: string;
  ephemeralPublicKeyB: string;
};

export type PfsRekeyKdfContext = {
  sessionId: string;
  timestamp: number;
  initiatorEphemeralPubB64: string;
  responderEphemeralPubB64: string;
  nodeIdA: string;
  nodeIdB: string;
};

/** Deterministic binding: sorted (nodeId||ephemeral) pairs + sessionId (16F.X5.X6.HARDENING). */
export function buildPfsHandshakeContextDigest(ctx: PfsHandshakeKdfContext): Buffer {
  const pairs: [string, string][] = [
    [ctx.nodeIdA, ctx.ephemeralPublicKeyA],
    [ctx.nodeIdB, ctx.ephemeralPublicKeyB],
  ];
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const h = createHash('sha256');
  h.update(pairs[0]![0], 'utf8');
  h.update(pairs[0]![1], 'utf8');
  h.update(pairs[1]![0], 'utf8');
  h.update(pairs[1]![1], 'utf8');
  h.update(ctx.sessionId, 'utf8');
  return h.digest();
}

/**
 * Derive a 32-byte AES-256 key from ECDH output using HKDF-SHA256 with context-bound salt.
 */
export function deriveSessionKey(sharedSecret: Buffer, context: PfsHandshakeKdfContext): Buffer {
  const salt = buildPfsHandshakeContextDigest(context);
  const info = Buffer.from('iris-pfs-handshake-v2', 'utf8');
  return Buffer.from(hkdfSync('sha256', sharedSecret, salt, info, 32));
}

function buildPfsRekeyContextDigest(ctx: PfsRekeyKdfContext): Buffer {
  const idPair = [ctx.nodeIdA, ctx.nodeIdB].sort();
  const epair = [ctx.initiatorEphemeralPubB64, ctx.responderEphemeralPubB64].sort();
  return createHash('sha256')
    .update(ctx.sessionId, 'utf8')
    .update(String(ctx.timestamp), 'utf8')
    .update(idPair[0]!, 'utf8')
    .update(idPair[1]!, 'utf8')
    .update(epair[0]!, 'utf8')
    .update(epair[1]!, 'utf8')
    .digest();
}

/** PFS rekey: ECDH bound to session, wall-clock, both node IDs, and both ephemerals. */
export function deriveRekeySessionKey(sharedSecret: Buffer, context: PfsRekeyKdfContext): Buffer {
  const salt = buildPfsRekeyContextDigest(context);
  const info = Buffer.from('iris-pfs-rekey-v2', 'utf8');
  return Buffer.from(hkdfSync('sha256', sharedSecret, salt, info, 32));
}
