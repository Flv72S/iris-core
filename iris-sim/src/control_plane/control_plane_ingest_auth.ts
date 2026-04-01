/**
 * Microstep 16D.X1 — Verify signed ingest (HMAC + nonce + clock skew).
 */

import { randomBytes } from 'node:crypto';

import {
  IRIS_AUTH_CLOCK_SKEW_MS,
  IRIS_HEADER_NODE_ID,
  IRIS_HEADER_NONCE,
  IRIS_HEADER_SIGNATURE,
  IRIS_HEADER_TIMESTAMP,
} from '../security/index.js';
import { verifySignature } from '../security/hmac.js';
import type { NonceStore } from '../security/nonce.js';
import { securityLog } from '../security/security_logger.js';
import { stableStringify } from '../security/stable_json.js';
import type { TrustState } from './trust_types.js';

const DUMMY_SECRET = randomBytes(32).toString('hex');

export type IngestAuthMode = 'signed' | 'unsigned_dev';

export type IngestAuthResult =
  | { ok: true; mode: IngestAuthMode }
  | { ok: false; status: 400 | 401; error: string };

function header(headers: Record<string, string | undefined>, name: string): string | undefined {
  const v = headers[name.toLowerCase()] ?? headers[name];
  return v && v.length > 0 ? v : undefined;
}

export function buildSignedPayloadString(input: {
  nodeId: string;
  timestamp: number;
  nonce: string;
  body: { nodeId: string; snapshot: unknown };
}): string {
  return stableStringify({
    body: input.body,
    nodeId: input.nodeId,
    nonce: input.nonce,
    timestamp: input.timestamp,
  });
}

/**
 * Zero-trust verification for POST /ingest.
 * - `requireSignedIngest`: reject unsigned requests (production).
 * - Otherwise unsigned requests are accepted with mode `unsigned_dev` (caller should warn).
 */
export function verifyIngestRequestAuth(input: {
  requireSignedIngest: boolean;
  now: number;
  headers: Record<string, string | undefined>;
  parsedBody: { nodeId: string; snapshot: unknown };
  getNodeAuth: (nodeId: string) => {
    trustState: TrustState;
    activeSecret?: string;
    nextSecret?: string;
    rotationExpiresAt?: number;
  } | undefined;
  expireRotation?: (nodeId: string) => boolean;
  nonceStore: NonceStore;
  log?: (event: string, meta?: Record<string, unknown>) => void;
}): IngestAuthResult {
  const log = input.log ?? securityLog;
  const h = input.headers;
  const nid = header(h, IRIS_HEADER_NODE_ID);
  const ts = header(h, IRIS_HEADER_TIMESTAMP);
  const nonce = header(h, IRIS_HEADER_NONCE);
  const sig = header(h, IRIS_HEADER_SIGNATURE);

  const present = [nid, ts, nonce, sig].filter(Boolean).length;
  if (present !== 0 && present !== 4) {
    return { ok: false, status: 400, error: 'incomplete auth headers' };
  }

  if (present === 0) {
    if (input.requireSignedIngest) {
      return { ok: false, status: 401, error: 'signed ingest required' };
    }
    return { ok: true, mode: 'unsigned_dev' };
  }

  if (nid !== input.parsedBody.nodeId) {
    return { ok: false, status: 401, error: 'node id mismatch' };
  }

  const requestTs = Number(ts);
  if (!Number.isFinite(requestTs)) {
    return { ok: false, status: 400, error: 'invalid timestamp' };
  }
  if (Math.abs(input.now - requestTs) > IRIS_AUTH_CLOCK_SKEW_MS) {
    log('AUTH_TIMESTAMP_INVALID', { nodeId: nid, ts: requestTs });
    return { ok: false, status: 401, error: 'timestamp out of window' };
  }

  if (input.nonceStore.isReplay(nid!, nonce!)) {
    log('AUTH_REPLAY_DETECTED', { nodeId: nid, nonce });
    return { ok: false, status: 401, error: 'nonce replay' };
  }

  const authInfo = input.getNodeAuth(nid!);
  const activeSecret = authInfo?.activeSecret;
  const nextSecret = authInfo?.nextSecret;

  const secrets = [activeSecret, nextSecret].filter((x): x is string => typeof x === 'string' && x.length > 0);
  const verifySecrets = secrets.length > 0 ? secrets : [DUMMY_SECRET];

  const payload = buildSignedPayloadString({
    nodeId: nid!,
    timestamp: requestTs,
    nonce: nonce!,
    body: { nodeId: input.parsedBody.nodeId, snapshot: input.parsedBody.snapshot },
  });

  let signatureOk = false;
  for (const s of verifySecrets) {
    if (verifySignature(s, payload, sig!)) {
      signatureOk = true;
      break;
    }
  }

  if (!signatureOk) {
    log('AUTH_INVALID_SIGNATURE', { nodeId: nid });
    return { ok: false, status: 401, error: 'invalid signature' };
  }

  if (!authInfo || secrets.length === 0) {
    log('AUTH_UNKNOWN_NODE_OR_MISSING_SECRET', { nodeId: nid });
    log('AUTH_UNKNOWN_NODE', { nodeId: nid });
    return { ok: false, status: 401, error: 'unknown or invalid node credentials' };
  }

  if (authInfo.trustState === 'REVOKED') {
    return { ok: false, status: 401, error: 'node revoked' };
  }
  if (authInfo.trustState === 'PENDING') {
    return { ok: false, status: 401, error: 'node pending activation' };
  }
  if (
    authInfo.trustState === 'ROTATING' &&
    authInfo.rotationExpiresAt !== undefined &&
    input.now > authInfo.rotationExpiresAt
  ) {
    input.expireRotation?.(nid!);
    log('ROTATION_EXPIRED', { nodeId: nid });
    return { ok: false, status: 401, error: 'rotation expired' };
  }

  return { ok: true, mode: 'signed' };
}
