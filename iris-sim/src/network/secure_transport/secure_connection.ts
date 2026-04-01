import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { TransportSession } from './transport_session.js';
import type { TransportTrustLevel } from './transport_trust_enforcement.js';
import type { SessionState } from './session_state.js';
import { securityLog } from '../../security/security_logger.js';
import { SlidingWindowRateLimiter } from './rate_limit.js';
import type { ReplayGuard } from './replay_protection.js';
import { TtlNonceReplayGuard } from './replay_protection.js';
import { incMetric, patchTransportSessionLifecycleDebug, patchTransportSessionScpDebug } from './transport_metrics.js';
import type { TransportAuditHook } from './audit_hooks.js';
import { enforceConnectionTrust, enforceSendPermission, type TransportTrustEngineLike } from './transport_trust_enforcement.js';
import { signPayload, verifySignature } from '../../security/hmac.js';
import { stableStringify } from '../../security/stable_json.js';
import { deriveRekeySessionKey } from './pfs_kdf.js';
import { deriveSharedSecret, generateEphemeralKeyPair, zeroBuffer } from './pfs_keys.js';
import { parseEphemeralPublicKeyB64 } from './handshake_protocol.js';
import type { PfsMode, ResolvedSessionLifecycle } from './transport_policy.js';
import {
  canTriggerRekey,
  createSessionControlPlane,
  resolveRekeyCollision,
  transitionSessionState,
  type SessionControlPlane,
} from './session_control_plane.js';

export type RekeyTriggerReason = 'TIME' | 'DATA' | 'MANUAL';

export type SecureMessageFrame = {
  ivB64: string;
  ciphertextB64: string;
  authTagB64: string;
};

function aesKeyFromHash(hex: string): Buffer {
  return Buffer.from(hex, 'hex'); // 32 bytes
}

function encryptAes256Gcm(args: { keyHex: string; plaintext: Uint8Array }): SecureMessageFrame {
  const iv = randomBytes(12);
  const key = aesKeyFromHash(args.keyHex);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(args.plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ivB64: iv.toString('base64'), ciphertextB64: ct.toString('base64'), authTagB64: tag.toString('base64') };
}

function decryptAes256Gcm(args: { keyHex: string; frame: SecureMessageFrame }): Uint8Array {
  const key = aesKeyFromHash(args.keyHex);
  const iv = Buffer.from(args.frame.ivB64, 'base64');
  const ct = Buffer.from(args.frame.ciphertextB64, 'base64');
  const tag = Buffer.from(args.frame.authTagB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt;
}

export interface SecureConnection {
  peerNodeId: string;
  peerDomainId?: string;
  sessionId: string;
  state: SessionState;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  rekeyAt: number;
  send(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  isAuthenticated(): boolean;
  /**
   * Optional: test/debug hook for receiving plaintext after transport-level decryption.
   */
  onReceive?(handler: (data: Uint8Array) => void): void;

  /** Optional: inspection hook for tests (encrypted frames). */
  getLastEncryptedFrame?(): SecureMessageFrame | null;
  session: TransportSession;
  trustLevel: TransportTrustLevel;
  touch(): void;
  handleIncomingEncrypted(frame: SecureMessageFrame): void;
  /** Optional hardening hook: proactively request a rekey. */
  requestRekey?(reason?: RekeyTriggerReason): Promise<void>;
  /** 16F.X5.X7 — terminate session, zero keys, audit. */
  terminateSession?(reason: string): Promise<void>;
  /** Bytes encrypted under current channel key (outbound DATA). */
  bytesSent?: number;
  /** Bytes decrypted under current channel key (inbound DATA). */
  bytesReceived?: number;
  /** Last successful rekey completion time (epoch ms). */
  lastRekeyAt?: number;
  /** Optional hardening hook: tests can force lifecycle enforcement. */
  __enforceLifecycle?(): void;
  /** Optional hardening hook: wire encrypted frame delivery. */
  __setFrameSink?(sink: (frame: SecureMessageFrame) => void): void;
  /** Optional hardening hook: swap runtime trust engine dynamically. */
  __setTrustEngine?(trustEngine: TransportTrustEngineLike | undefined): void;

  /** True when the session key was derived via ECDHE + HKDF (16F.X5.X6). */
  pfsEnabled: boolean;
  /** Preferred follow-up rekey strategy for this session. */
  rekeyMode: 'SYMMETRIC' | 'PFS';
  /**
   * Optional shared secret material (cleared — not retained after handshake in normal operation).
   * Present only when a test hook explicitly retains it; do not log or persist.
   */
  sharedSecret?: Buffer;
}

export function createSecureConnection(args: {
  /** This endpoint's node id (owner of the connection object). */
  localNodeId: string;
  peerNodeId: string;
  peerDomainId?: string;
  session: TransportSession;
  trustLevel: TransportTrustLevel;
  idleTimeoutMs?: number;
  channelKeyHex: string;
  expiresAt?: number;
  rekeyAt?: number;
  trustEngine?: TransportTrustEngineLike;
  auditHook?: TransportAuditHook;
  rateLimit?: { messagesPerSecond: number; bytesPerSecond: number; windowMs?: number };
  replayGuard?: ReplayGuard;
  now?: () => number;
  debugTamperRekeyResponse?: boolean;
  pfsEnabled?: boolean;
  rekeyMode?: 'SYMMETRIC' | 'PFS';
  /** 16F.X5.X7 — merged lifecycle policy; omit for legacy behavior. */
  sessionLifecycle?: ResolvedSessionLifecycle;
  /** Policy mode for STRICT lifecycle / rekey rules. */
  pfsMode?: PfsMode;
  /** 16F.X5.X7.HARDENING — traffic behavior during rekey transitions. */
  trafficDuringRekey?: 'BLOCK' | 'ALLOW';
}): SecureConnection {
  let authed = true;
  let closed = false;
  const session = args.session;
  const nowFn = args.now ?? Date.now;
  session.lastActivity = nowFn();
  let lastFrame: SecureMessageFrame | null = null;
  let recvHandler: ((data: Uint8Array) => void) | null = null;
  let timeoutHandle: NodeJS.Timeout | null = null;
  let state: SessionState = 'ACTIVE';
  const createdAt = session.createdAt ?? nowFn();
  let lastActivityAt = session.lastActivity;
  const expiresAt = args.expiresAt ?? createdAt + 5 * 60_000;
  const lc = args.sessionLifecycle;
  let rekeyAt =
    args.rekeyAt ?? (lc ? createdAt + lc.rekeyIntervalMs : Number.POSITIVE_INFINITY);
  // SCP + key epochs (16F.X5.X7.HARDENING)
  const scp: SessionControlPlane = createSessionControlPlane({
    localNodeId: args.localNodeId,
    remoteNodeId: args.peerNodeId,
    now: nowFn,
  });
  args.auditHook?.({
    type: 'REKEY_LEADER_ELECTED',
    timestamp: nowFn(),
    sessionId: session.sessionId,
    peerNodeId: args.peerNodeId,
    meta: {
      role: scp.rekeyRole,
      leader: args.localNodeId.localeCompare(args.peerNodeId) <= 0 ? args.localNodeId : args.peerNodeId,
    },
  });
  patchTransportSessionScpDebug({
    scp: { state: 'STABLE', rekeyEpoch: 0, role: scp.rekeyRole, rekeyInProgress: false },
  });
  const trafficDuringRekey = args.trafficDuringRekey ?? 'ALLOW';

  let keyEpoch = 0;
  let activeKeyHex = args.channelKeyHex;
  let previousKeyHex: string | null = null;
  let previousKeyExpiresAt: number | null = null;
  const previousKeyTtlMs = 5000;

  const pfsEnabled = args.pfsEnabled ?? false;
  const rekeyMode = args.rekeyMode ?? (pfsEnabled ? 'PFS' : 'SYMMETRIC');
  let lastRekeyAt = createdAt;
  let bytesSentTotal = 0;
  let bytesReceivedTotal = 0;
  let rekeyPendingSince: number | null = null;
  let rekeyFailureStreak = 0;
  let rekeyWaitResolve: (() => void) | null = null;
  let autoRekeyInFlight = false;
  let runtimeTrustEngine: TransportTrustEngineLike | undefined = args.trustEngine;
  let frameSink: ((frame: SecureMessageFrame) => void) | null = null;
  let pendingPfsRekeyPrivateKey: Buffer | null = null;
  let pendingPfsRekeyInitiatorPubB64: string | null = null;
  const replayGuard = args.replayGuard ?? new TtlNonceReplayGuard({ ttlMs: 30_000, maxEntries: 50_000, now: nowFn });

  const rate = new SlidingWindowRateLimiter({
    windowMs: args.rateLimit?.windowMs ?? 1000,
    messagesPerSecond: args.rateLimit?.messagesPerSecond ?? 100,
    bytesPerSecond: args.rateLimit?.bytesPerSecond ?? 1_000_000,
    now: nowFn,
  });

  type ControlMsg =
    | { type: 'DATA'; sessionId: string; nonce: string; timestamp: number; keyEpoch: number; dataB64: string }
    | {
        type: 'REKEY_REQUEST';
        sessionId: string;
        timestamp: number;
        keyEpoch: number;
        reason?: RekeyTriggerReason;
        pfs?: boolean;
        ephemeralPublicKey?: string;
      }
    | {
        type: 'REKEY_RESPONSE';
        sessionId: string;
        timestamp: number;
        keyEpoch: number;
        reason?: RekeyTriggerReason;
        signatureB64: string;
        newKeyMaterialHex?: string;
        pfs?: boolean;
        ephemeralPublicKey?: string;
      };

  const pushLifecycleDebug = (): void => {
    if (!lc) return;
    const now = nowFn();
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: {
        ageMs: now - createdAt,
        bytesSent: bytesSentTotal,
        bytesReceived: bytesReceivedTotal,
        lastRekeyAt,
      },
    });
  };

  const zeroChannelKeyMaterial = (): void => {
    const keys = [activeKeyHex, previousKeyHex].filter((k): k is string => typeof k === 'string');
    for (const k of keys) {
      const b = Buffer.from(k, 'hex');
      zeroBuffer(b);
    }
    activeKeyHex = Buffer.alloc(32, 0).toString('hex');
    previousKeyHex = null;
    previousKeyExpiresAt = null;
  };

  const signalRekeyWait = (): void => {
    const r = rekeyWaitResolve;
    rekeyWaitResolve = null;
    r?.();
  };

  const patchScpDebug = (): void => {
    patchTransportSessionScpDebug({
      scp: { state: scp.state, rekeyEpoch: scp.rekeyEpoch, role: scp.rekeyRole, rekeyInProgress: scp.rekeyInProgress },
    });
  };

  const transition = (next: 'STABLE' | 'REKEYING' | 'SWITCHING' | 'TERMINATED', meta?: Record<string, unknown>): void => {
    transitionSessionState(scp, next, meta);
    args.auditHook?.({
      type: 'SESSION_STATE_TRANSITION',
      timestamp: nowFn(),
      sessionId: session.sessionId,
      peerNodeId: args.peerNodeId,
      meta: { next, ...(meta ? meta : {}) },
    });
    patchScpDebug();
  };

  const touch = (): void => {
    const now = nowFn();
    session.lastActivity = now;
    lastActivityAt = now;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (typeof args.idleTimeoutMs === 'number') {
      timeoutHandle = setTimeout(() => {
        // idle close
        securityLog('SESSION_IDLE_TIMEOUT', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
        void argsPeerClose('CLOSED');
      }, args.idleTimeoutMs);
      if (typeof timeoutHandle.unref === 'function') timeoutHandle.unref();
    }
  };

  const argsPeerClose = async (newState: SessionState = 'CLOSED'): Promise<void> => {
    closed = true;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    authed = false;
    state = newState;
    incMetric('activeConnections', -1);
    incMetric('activeSessions', -1);
    args.auditHook?.({
      type: 'TRANSPORT_CLOSE',
      timestamp: nowFn(),
      sessionId: session.sessionId,
      peerNodeId: args.peerNodeId,
      ...(args.peerDomainId !== undefined ? { peerDomainId: args.peerDomainId } : {}),
    });
  };

  const terminateSession = async (reason: string): Promise<void> => {
    if (closed) return;
    securityLog('SESSION_TERMINATED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, reason });
    if (reason === 'REKEY_TIMEOUT' || reason === 'SESSION_SECURITY_VIOLATION' || reason === 'DOWNGRADE_ATTEMPT') {
      securityLog('SESSION_SECURITY_VIOLATION', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, reason });
    }
    zeroChannelKeyMaterial();
    try {
      transition('TERMINATED', { reason });
    } catch {
      // ignore invalid transitions during termination
    }
    incMetric('sessionTerminated', 1);
    args.auditHook?.({
      type: 'SESSION_TERMINATED',
      timestamp: nowFn(),
      sessionId: session.sessionId,
      peerNodeId: args.peerNodeId,
      meta: { reason },
    });
    await argsPeerClose('CLOSED');
  };

  const enforceLifecycle = (): void => {
    const now = nowFn();
    if (closed) return;
    // dual-key expiry
    if (previousKeyHex && previousKeyExpiresAt != null && now >= previousKeyExpiresAt) {
      securityLog('PREVIOUS_KEY_EXPIRED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      previousKeyHex = null;
      previousKeyExpiresAt = null;
    }
    if (lc && state === 'REKEYING' && rekeyPendingSince != null && now - rekeyPendingSince > lc.rekeyPendingTimeoutMs) {
      securityLog('REKEY_TIMEOUT', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      void terminateSession('REKEY_TIMEOUT');
      return;
    }
    if (lc && now - createdAt > lc.maxSessionDurationMs) {
      securityLog('SESSION_EXPIRED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, cause: 'max-wall' });
      securityLog('SESSION_LIFETIME_ENFORCED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      incMetric('sessionExpired', 1);
      args.auditHook?.({ type: 'SESSION_EXPIRED', timestamp: nowFn(), sessionId: session.sessionId, peerNodeId: args.peerNodeId });
      void terminateSession('SESSION_LIFETIME');
      return;
    }
    if (now >= expiresAt) {
      securityLog('SESSION_EXPIRED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, cause: 'expiresAt' });
      incMetric('sessionExpired', 1);
      args.auditHook?.({ type: 'SESSION_EXPIRED', timestamp: nowFn(), sessionId: session.sessionId, peerNodeId: args.peerNodeId });
      void terminateSession('SESSION_EXPIRED');
      return;
    }
    if (typeof args.idleTimeoutMs === 'number' && now - lastActivityAt > args.idleTimeoutMs) {
      securityLog('SESSION_IDLE_TIMEOUT', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      void argsPeerClose('CLOSED');
      return;
    }
  };

  const enforceDynamicTrust = (direction: 'send' | 'receive'): TransportTrustLevel => {
    if (!runtimeTrustEngine) return args.trustLevel;
    try {
      const level = enforceConnectionTrust({
        trustEngine: runtimeTrustEngine,
        peerNodeId: args.peerNodeId,
        ...(args.peerDomainId !== undefined ? { peerDomainId: args.peerDomainId } : {}),
      });
      return level;
    } catch (e) {
      securityLog('TRANSPORT_TRUST_VIOLATION', { direction, peerNodeId: args.peerNodeId, code: (e as any).code });
      void argsPeerClose('CLOSED');
      throw e;
    }
  };

  const encodeControl = (msg: ControlMsg): Uint8Array => {
    return new TextEncoder().encode(JSON.stringify(msg));
  };
  const decodeControl = (data: Uint8Array): ControlMsg => {
    const s = new TextDecoder().decode(data);
    return JSON.parse(s) as ControlMsg;
  };

  const sendControl = async (msg: ControlMsg): Promise<void> => {
    const bytes = encodeControl(msg);
    const frame = encryptAes256Gcm({ keyHex: activeKeyHex, plaintext: bytes });
    lastFrame = frame;
    frameSink?.(frame);
  };

  const abortLocalRekey = (): void => {
    if (pendingPfsRekeyPrivateKey) zeroBuffer(pendingPfsRekeyPrivateKey);
    pendingPfsRekeyPrivateKey = null;
    pendingPfsRekeyInitiatorPubB64 = null;
    rekeyPendingSince = null;
    rekeyFailureStreak += 1;
    state = 'ACTIVE';
    try {
      transition('STABLE', { cause: 'collision-abort' });
    } catch {
      // best effort
    }
    signalRekeyWait();
  };

  const completeRekeySuccess = (
    fromInitiatorResponse: boolean,
    trigger: RekeyTriggerReason | undefined,
    isPfsRekey: boolean,
  ): void => {
    const t = nowFn();
    state = 'ACTIVE';
    lastRekeyAt = t;
    bytesSentTotal = 0;
    bytesReceivedTotal = 0;
    rekeyPendingSince = null;
    rekeyFailureStreak = 0;
    rekeyAt = lc ? t + lc.rekeyIntervalMs : Number.POSITIVE_INFINITY;
    incMetric('rekeys', 1);
    securityLog('SESSION_REKEY_COMPLETED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
    securityLog('PFS_REKEY_SUCCESS', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
    if (trigger === 'TIME' && lc && pfsEnabled) {
      securityLog('PFS_CONTINUOUS_ENFORCED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      args.auditHook?.({
        type: 'PFS_CONTINUOUS_ENFORCED',
        timestamp: t,
        sessionId: session.sessionId,
        peerNodeId: args.peerNodeId,
        meta: { trigger },
      });
    }
    if (isPfsRekey) {
      args.auditHook?.({ type: 'PFS_REKEY', timestamp: t, sessionId: session.sessionId, peerNodeId: args.peerNodeId });
    }
    args.auditHook?.({ type: 'TRANSPORT_REKEY', timestamp: t, sessionId: session.sessionId, peerNodeId: args.peerNodeId });
    pushLifecycleDebug();
    try {
      transition('STABLE', { epoch: keyEpoch });
    } catch {
      // best effort
    }
    if (fromInitiatorResponse) signalRekeyWait();
  };

  const waitRekeySettled = async (): Promise<void> => {
    const timeoutMs = lc?.rekeyPendingTimeoutMs ?? 60_000;
    const t0 = nowFn();
    while (state === 'REKEYING' && !closed) {
      if (nowFn() - t0 > timeoutMs) {
        throw new Error('SESSION_REKEY_TIMEOUT');
      }
      await new Promise<void>((r) => setImmediate(r));
    }
    if (closed) throw new Error('TRANSPORT_CLOSED');
  };

  const requestRekeyImpl = async (triggerReason: RekeyTriggerReason): Promise<void> => {
    if (closed) throw new Error('TRANSPORT_CLOSED');
    enforceLifecycle();
    if (state === 'REKEYING') throw new Error('TRANSPORT_REKEY_IN_PROGRESS');
    const now = nowFn();
    const gate = canTriggerRekey(scp, now);
    // Backward compatibility: allow MANUAL rekey requests from either side.
    if (!gate.ok && !(triggerReason === 'MANUAL' && gate.reason === 'NOT_LEADER')) {
      if (gate.reason === 'COOLDOWN') incMetric('rekeyCooldownBlocked', 1);
      return;
    }
    try {
      transition('REKEYING', { reason: triggerReason });
    } catch {
      // ignore
    }
    if (triggerReason === 'TIME') {
      securityLog('PFS_REKEY_TRIGGERED_TIME', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      incMetric('rekeyTriggeredTime', 1);
    } else if (triggerReason === 'DATA') {
      securityLog('KEY_EXHAUSTION_THRESHOLD', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      securityLog('PFS_REKEY_TRIGGERED_DATA_LIMIT', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      incMetric('rekeyTriggeredData', 1);
      args.auditHook?.({
        type: 'KEY_EXHAUSTION',
        timestamp: nowFn(),
        sessionId: session.sessionId,
        peerNodeId: args.peerNodeId,
      });
    }
    args.auditHook?.({
      type: 'PFS_REKEY_TRIGGERED',
      timestamp: nowFn(),
      sessionId: session.sessionId,
      peerNodeId: args.peerNodeId,
      meta: { reason: triggerReason },
    });
    rekeyPendingSince = nowFn();
    try {
      if (rekeyMode === 'PFS') {
        if (pendingPfsRekeyPrivateKey) throw new Error('SESSION_REKEY_IN_PROGRESS');
        const ep = generateEphemeralKeyPair();
        pendingPfsRekeyPrivateKey = ep.privateKey;
        pendingPfsRekeyInitiatorPubB64 = ep.publicKey.toString('base64');
        state = 'REKEYING';
        securityLog('SESSION_REKEY_STARTED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, reason: triggerReason });
        await sendControl({
          type: 'REKEY_REQUEST',
          sessionId: session.sessionId,
          timestamp: nowFn(),
          keyEpoch,
          reason: triggerReason,
          pfs: true,
          ephemeralPublicKey: pendingPfsRekeyInitiatorPubB64,
        });
        await waitRekeySettled();
        return;
      }
      state = 'REKEYING';
      securityLog('SESSION_REKEY_STARTED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, reason: triggerReason });
      await sendControl({
        type: 'REKEY_REQUEST',
        sessionId: session.sessionId,
        timestamp: nowFn(),
        keyEpoch,
        reason: triggerReason,
      });
      await waitRekeySettled();
    } catch (e) {
      if ((e as Error).message === 'SESSION_REKEY_TIMEOUT') {
        securityLog('PFS_REKEY_FAILED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, cause: 'timeout' });
        void terminateSession('REKEY_TIMEOUT');
      }
      throw e;
    }
  };

  const maybeAutoRekey = async (): Promise<void> => {
    if (!lc || closed || state !== 'ACTIVE' || autoRekeyInFlight) return;
    autoRekeyInFlight = true;
    try {
      const now = nowFn();
      if (bytesSentTotal >= lc.maxBytesPerKey) {
        await requestRekeyImpl('DATA');
      } else if (now >= rekeyAt) {
        await requestRekeyImpl('TIME');
      }
    } finally {
      autoRekeyInFlight = false;
    }
  };

  const send = async (data: Uint8Array): Promise<void> => {
    if (closed) throw new Error('TRANSPORT_CLOSED');
    if (!authed) throw new Error('TRANSPORT_NOT_AUTHENTICATED');
    enforceLifecycle();
    if (closed) throw new Error('TRANSPORT_CLOSED');
    if (state === 'REKEYING') {
      if (trafficDuringRekey === 'BLOCK') {
        securityLog('TRAFFIC_BLOCKED_DURING_REKEY', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
        const err = new Error('TRAFFIC_BLOCKED_DURING_REKEY');
        (err as NodeJS.ErrnoException).code = 'TRAFFIC_BLOCKED_DURING_REKEY';
        throw err;
      }
      securityLog('TRAFFIC_ALLOWED_DURING_REKEY', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
    }
    const level = enforceDynamicTrust('send');
    enforceSendPermission({ trustLevel: level });

    if (!rate.allow(data.byteLength)) {
      incMetric('rateLimited', 1);
      securityLog('TRANSPORT_RATE_LIMIT_EXCEEDED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      void argsPeerClose('CLOSED');
      const err = new Error('TRANSPORT_RATE_LIMIT_EXCEEDED');
      (err as any).code = 'TRANSPORT_RATE_LIMIT_EXCEEDED';
      throw err;
    }
    touch();
    if (state === 'ACTIVE') await maybeAutoRekey();
    if (closed) {
      const err = new Error('TRANSPORT_CLOSED');
      (err as NodeJS.ErrnoException).code = 'TRANSPORT_CLOSED';
      throw err;
    }
    if (state !== 'ACTIVE' && state !== 'REKEYING') {
      const err = new Error('TRANSPORT_REKEY_IN_PROGRESS');
      (err as NodeJS.ErrnoException).code = 'TRANSPORT_REKEY_IN_PROGRESS';
      throw err;
    }
    const plen = data.byteLength;
    await sendControl({
      type: 'DATA',
      sessionId: session.sessionId,
      nonce: `${nowFn()}:${Math.random()}`,
      timestamp: nowFn(),
      keyEpoch,
      dataB64: Buffer.from(data).toString('base64'),
    });
    bytesSentTotal += plen;
    pushLifecycleDebug();
  };

  const handleIncomingEncrypted = (frame: SecureMessageFrame): void => {
    if (closed) return;
    if (!authed) return;
    enforceLifecycle();
    enforceDynamicTrust('receive');
    // rate limit encrypted frame sizes too
    const approxBytes = Buffer.from(frame.ciphertextB64, 'base64').byteLength;
    if (!rate.allow(approxBytes)) {
      incMetric('rateLimited', 1);
      securityLog('TRANSPORT_RATE_LIMIT_EXCEEDED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
      void argsPeerClose('CLOSED');
      return;
    }
    touch();
    lastFrame = frame;
    let pt: Uint8Array;
    try {
      pt = decryptAes256Gcm({ keyHex: activeKeyHex, frame });
    } catch (e) {
      if (previousKeyHex) {
        try {
          pt = decryptAes256Gcm({ keyHex: previousKeyHex, frame });
        } catch {
          securityLog('TRANSPORT_VIOLATION', { peerNodeId: args.peerNodeId, reason: 'decrypt-failed' });
          void argsPeerClose('CLOSED');
          return;
        }
      } else {
        securityLog('TRANSPORT_VIOLATION', { peerNodeId: args.peerNodeId, reason: 'decrypt-failed' });
        void argsPeerClose('CLOSED');
        return;
      }
    }
    let msg: ControlMsg;
    try {
      msg = decodeControl(pt);
    } catch {
      securityLog('TRANSPORT_VIOLATION', { peerNodeId: args.peerNodeId, reason: 'non-json-frame' });
      void argsPeerClose('CLOSED');
      return;
    }
    if ((msg as any).sessionId !== session.sessionId) {
      securityLog('TRANSPORT_VIOLATION', { peerNodeId: args.peerNodeId, reason: 'sessionId-mismatch' });
      void argsPeerClose('CLOSED');
      return;
    }
    // per-session replay: use nonce when present
    if (msg.type === 'DATA') {
      // epoch binding
      if (msg.keyEpoch < keyEpoch - 1 || msg.keyEpoch > keyEpoch) {
        securityLog('KEY_EPOCH_MISMATCH', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, got: msg.keyEpoch, expected: keyEpoch });
        void argsPeerClose('CLOSED');
        return;
      }
      if (replayGuard.isReplay(args.peerNodeId, msg.nonce)) {
        incMetric('replayAttacksDetected', 1);
        incMetric('replayDetected', 1);
        securityLog('TRANSPORT_REPLAY_DETECTED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
        args.auditHook?.({ type: 'REPLAY_DETECTED', timestamp: nowFn(), sessionId: session.sessionId, peerNodeId: args.peerNodeId });
        void argsPeerClose('CLOSED');
        return;
      }
      const payload = Buffer.from(msg.dataB64, 'base64');
      bytesReceivedTotal += payload.byteLength;
      pushLifecycleDebug();
      recvHandler?.(payload);
      return;
    }
    if (msg.type === 'REKEY_REQUEST') {
      // collision resolution
      const decision = resolveRekeyCollision({
        localNodeId: args.localNodeId,
        remoteNodeId: args.peerNodeId,
        localRekeyInProgress: scp.rekeyInProgress || state === 'REKEYING',
        incomingRekey: true,
      });
      if (decision !== 'NO_COLLISION') {
        incMetric('rekeyCollisions', 1);
        args.auditHook?.({
          type: 'REKEY_COLLISION_RESOLVED',
          timestamp: nowFn(),
          sessionId: session.sessionId,
          peerNodeId: args.peerNodeId,
          meta: { decision },
        });
      }
      if (decision === 'ABORT_LOCAL_REKEY') abortLocalRekey();
      if (decision === 'IGNORE_INCOMING') return;
      state = 'REKEYING';
      try {
        transition('REKEYING', { side: 'responder', epoch: keyEpoch });
      } catch {
        // ignore
      }
      securityLog('SESSION_REKEY_STARTED', {
        peerNodeId: args.peerNodeId,
        sessionId: session.sessionId,
        ...(msg.reason !== undefined ? { reason: msg.reason } : {}),
      });
      if (msg.pfs === true && msg.ephemeralPublicKey) {
        let initiatorPub: Buffer;
        try {
          initiatorPub = parseEphemeralPublicKeyB64(msg.ephemeralPublicKey);
        } catch {
          securityLog('PFS_INVALID_PUBLIC_KEY', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
          state = 'ACTIVE';
          return;
        }
        const responderEphemeral = generateEphemeralKeyPair();
        const ts = nowFn();
        let shared: Buffer;
        try {
          shared = deriveSharedSecret(responderEphemeral.privateKey, initiatorPub);
        } catch {
          securityLog('PFS_DERIVATION_FAILED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
          zeroBuffer(responderEphemeral.privateKey);
          state = 'ACTIVE';
          return;
        }
        const responderPubB64 = responderEphemeral.publicKey.toString('base64');
        const newKeyBuf = deriveRekeySessionKey(shared, {
          sessionId: session.sessionId,
          timestamp: ts,
          initiatorEphemeralPubB64: msg.ephemeralPublicKey,
          responderEphemeralPubB64: responderPubB64,
          nodeIdA: args.localNodeId,
          nodeIdB: args.peerNodeId,
        });
        zeroBuffer(shared);
        const newKeyHex = newKeyBuf.toString('hex');
        zeroBuffer(newKeyBuf);
        const payload = stableStringify({
          type: 'pfs-rekey',
          sessionId: session.sessionId,
          timestamp: ts,
          initiatorEphemeralPubB64: msg.ephemeralPublicKey,
          responderEphemeralPubB64: responderPubB64,
        });
        const signatureB64 = args.debugTamperRekeyResponse
          ? `${signPayload(activeKeyHex, payload)}tamper`
          : signPayload(activeKeyHex, payload);
        void sendControl({
          type: 'REKEY_RESPONSE',
          sessionId: session.sessionId,
          timestamp: ts,
          keyEpoch,
          pfs: true,
          ephemeralPublicKey: responderPubB64,
          signatureB64,
          ...(msg.reason !== undefined ? { reason: msg.reason } : {}),
        });
        zeroBuffer(responderEphemeral.privateKey);
        // dual-key window activation
        previousKeyHex = activeKeyHex;
        previousKeyExpiresAt = nowFn() + previousKeyTtlMs;
        activeKeyHex = newKeyHex;
        keyEpoch += 1;
        incMetric('dualKeyActive', 1);
        args.auditHook?.({ type: 'DUAL_KEY_WINDOW_ACTIVE', timestamp: nowFn(), sessionId: session.sessionId, peerNodeId: args.peerNodeId });
        securityLog('DUAL_KEY_WINDOW_ACTIVE', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, epoch: keyEpoch });
        try {
          transition('SWITCHING', { epoch: keyEpoch });
        } catch {
          // ignore
        }
        completeRekeySuccess(false, msg.reason, true);
        return;
      }
      // Symmetric rekey: responder picks random key material authenticated under the current channel key.
      const newKeyMaterialHex = Buffer.from(randomBytes(32)).toString('hex');
      const ts = nowFn();
      const payload = stableStringify({ sessionId: session.sessionId, newKeyMaterialHex, timestamp: ts });
      const signatureB64 = args.debugTamperRekeyResponse
        ? `${signPayload(activeKeyHex, payload)}tamper`
        : signPayload(activeKeyHex, payload);
      void sendControl({
        type: 'REKEY_RESPONSE',
        sessionId: session.sessionId,
        timestamp: ts,
        keyEpoch,
        newKeyMaterialHex,
        signatureB64,
        ...(msg.reason !== undefined ? { reason: msg.reason } : {}),
      });
      previousKeyHex = activeKeyHex;
      previousKeyExpiresAt = nowFn() + previousKeyTtlMs;
      activeKeyHex = newKeyMaterialHex;
      keyEpoch += 1;
      incMetric('dualKeyActive', 1);
      args.auditHook?.({ type: 'DUAL_KEY_WINDOW_ACTIVE', timestamp: nowFn(), sessionId: session.sessionId, peerNodeId: args.peerNodeId });
      securityLog('DUAL_KEY_WINDOW_ACTIVE', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, epoch: keyEpoch });
      try {
        transition('SWITCHING', { epoch: keyEpoch });
      } catch {
        // ignore
      }
      completeRekeySuccess(false, msg.reason, false);
      return;
    }
    if (msg.type === 'REKEY_RESPONSE') {
      if (msg.pfs === true && msg.ephemeralPublicKey && pendingPfsRekeyPrivateKey && pendingPfsRekeyInitiatorPubB64) {
        const payload = stableStringify({
          type: 'pfs-rekey',
          sessionId: session.sessionId,
          timestamp: msg.timestamp,
          initiatorEphemeralPubB64: pendingPfsRekeyInitiatorPubB64,
          responderEphemeralPubB64: msg.ephemeralPublicKey,
        });
        if (!verifySignature(activeKeyHex, payload, msg.signatureB64)) {
          securityLog('PFS_REKEY_FAILED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
          if (pendingPfsRekeyPrivateKey) zeroBuffer(pendingPfsRekeyPrivateKey);
          pendingPfsRekeyPrivateKey = null;
          pendingPfsRekeyInitiatorPubB64 = null;
          rekeyFailureStreak += 1;
          if (rekeyFailureStreak >= 3) void terminateSession('SESSION_SECURITY_VIOLATION');
          state = 'ACTIVE';
          signalRekeyWait();
          return;
        }
        let shared: Buffer;
        try {
          shared = deriveSharedSecret(pendingPfsRekeyPrivateKey, parseEphemeralPublicKeyB64(msg.ephemeralPublicKey));
        } catch {
          securityLog('PFS_DERIVATION_FAILED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
          if (pendingPfsRekeyPrivateKey) zeroBuffer(pendingPfsRekeyPrivateKey);
          pendingPfsRekeyPrivateKey = null;
          pendingPfsRekeyInitiatorPubB64 = null;
          rekeyFailureStreak += 1;
          if (rekeyFailureStreak >= 3) void terminateSession('SESSION_SECURITY_VIOLATION');
          state = 'ACTIVE';
          signalRekeyWait();
          return;
        }
        const newKeyBuf = deriveRekeySessionKey(shared, {
          sessionId: session.sessionId,
          timestamp: msg.timestamp,
          initiatorEphemeralPubB64: pendingPfsRekeyInitiatorPubB64,
          responderEphemeralPubB64: msg.ephemeralPublicKey,
          nodeIdA: args.localNodeId,
          nodeIdB: args.peerNodeId,
        });
        zeroBuffer(shared);
        zeroBuffer(pendingPfsRekeyPrivateKey);
        pendingPfsRekeyPrivateKey = null;
        pendingPfsRekeyInitiatorPubB64 = null;
        const derivedHex = newKeyBuf.toString('hex');
        zeroBuffer(newKeyBuf);
        previousKeyHex = activeKeyHex;
        previousKeyExpiresAt = nowFn() + previousKeyTtlMs;
        activeKeyHex = derivedHex;
        keyEpoch += 1;
        scp.rekeyEpoch = keyEpoch;
        scp.lastRekeyAt = nowFn();
        incMetric('dualKeyActive', 1);
        args.auditHook?.({ type: 'DUAL_KEY_WINDOW_ACTIVE', timestamp: nowFn(), sessionId: session.sessionId, peerNodeId: args.peerNodeId });
        securityLog('DUAL_KEY_WINDOW_ACTIVE', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, epoch: keyEpoch });
        try {
          transition('SWITCHING', { epoch: keyEpoch });
        } catch {
          // ignore
        }
        completeRekeySuccess(true, msg.reason, true);
        return;
      }
      if (!msg.newKeyMaterialHex) {
        securityLog('SESSION_REKEY_FAILED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
        rekeyFailureStreak += 1;
        if (rekeyFailureStreak >= 3) void terminateSession('SESSION_SECURITY_VIOLATION');
        state = 'ACTIVE';
        signalRekeyWait();
        return;
      }
      const symPayload = stableStringify({
        sessionId: session.sessionId,
        newKeyMaterialHex: msg.newKeyMaterialHex,
        timestamp: msg.timestamp,
      });
      if (!verifySignature(activeKeyHex, symPayload, msg.signatureB64)) {
        securityLog('SESSION_REKEY_FAILED', { peerNodeId: args.peerNodeId, sessionId: session.sessionId });
        rekeyFailureStreak += 1;
        if (rekeyFailureStreak >= 3) void terminateSession('SESSION_SECURITY_VIOLATION');
        state = 'ACTIVE';
        signalRekeyWait();
        return;
      }
      previousKeyHex = activeKeyHex;
      previousKeyExpiresAt = nowFn() + previousKeyTtlMs;
      activeKeyHex = msg.newKeyMaterialHex;
      keyEpoch += 1;
      scp.rekeyEpoch = keyEpoch;
      scp.lastRekeyAt = nowFn();
      incMetric('dualKeyActive', 1);
      args.auditHook?.({ type: 'DUAL_KEY_WINDOW_ACTIVE', timestamp: nowFn(), sessionId: session.sessionId, peerNodeId: args.peerNodeId });
      securityLog('DUAL_KEY_WINDOW_ACTIVE', { peerNodeId: args.peerNodeId, sessionId: session.sessionId, epoch: keyEpoch });
      try {
        transition('SWITCHING', { epoch: keyEpoch });
      } catch {
        // ignore
      }
      completeRekeySuccess(true, msg.reason, false);
      return;
    }
  };

  const close = async (): Promise<void> => {
    await argsPeerClose('CLOSED');
  };

  if (typeof args.idleTimeoutMs === 'number') touch();

  const base = {
    peerNodeId: args.peerNodeId,
    session,
    trustLevel: args.trustLevel,
    isAuthenticated: () => authed && !closed,
    onReceive: (h: (data: Uint8Array) => void) => {
      recvHandler = h;
    },
    getLastEncryptedFrame: () => lastFrame,
    touch,
    send,
    close,
    handleIncomingEncrypted,
    sessionId: session.sessionId,
    state,
    createdAt,
    lastActivityAt,
    expiresAt,
    rekeyAt,
    requestRekey: async (reason?: RekeyTriggerReason) => requestRekeyImpl(reason ?? 'MANUAL'),
    terminateSession,
    __enforceLifecycle: () => enforceLifecycle(),
    __setFrameSink: (sink: (frame: SecureMessageFrame) => void) => {
      frameSink = sink;
    },
    __setTrustEngine: (te: TransportTrustEngineLike | undefined) => {
      runtimeTrustEngine = te;
    },
  };

  incMetric('activeConnections', 1);
  incMetric('activeSessions', 1);
  args.auditHook?.({
    type: 'TRANSPORT_CONNECT',
    timestamp: nowFn(),
    sessionId: session.sessionId,
    peerNodeId: args.peerNodeId,
    ...(args.peerDomainId !== undefined ? { peerDomainId: args.peerDomainId } : {}),
  });

  return {
    ...base,
    get bytesSent() {
      return bytesSentTotal;
    },
    get bytesReceived() {
      return bytesReceivedTotal;
    },
    get lastRekeyAt() {
      return lastRekeyAt;
    },
    pfsEnabled,
    rekeyMode,
    ...(args.peerDomainId !== undefined ? { peerDomainId: args.peerDomainId } : {}),
  };
}

