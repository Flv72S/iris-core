import type { PfsMode } from './transport_policy.js';

export type SecureTransportMetricsSnapshot = {
  activeConnections: number;
  activeSessions: number;
  rekeys: number;
  rejectedConnections: number;
  rateLimited: number;
  failedHandshakes: number;
  replayAttacksDetected: number;
  /** Cumulative successful PFS (ECDHE) handshakes (16F.X5.X6). */
  pfsSessions: number;
  /** Cumulative legacy session-key fallbacks when the client did not offer PFS. */
  pfsFallbacks: number;
  /** Sessions completed under STRICT PFS policy (16F.X5.X6.HARDENING). */
  pfsStrictSessions: number;
  /** Handshakes rejected for PFS policy / binding failures (16F.X5.X6.HARDENING). */
  pfsRejected: number;
  /** Detected downgrade attempts (client or policy) (16F.X5.X6.HARDENING). */
  pfsDowngradeAttempts: number;
  /** Sessions ended due to max wall-clock age (16F.X5.X7). */
  sessionExpired: number;
  /** Auto rekeys initiated by time policy (16F.X5.X7). */
  rekeyTriggeredTime: number;
  /** Auto rekeys initiated by byte cap (16F.X5.X7). */
  rekeyTriggeredData: number;
  /** Forced or policy terminations (16F.X5.X7). */
  sessionTerminated: number;
  /** Rekey triggers blocked by cooldown (16F.X5.X7.HARDENING). */
  rekeyCooldownBlocked: number;
  /** Rekey collisions observed/resolved (16F.X5.X7.HARDENING). */
  rekeyCollisions: number;
  /** Dual-key window activations (16F.X5.X7.HARDENING). */
  dualKeyActive: number;
  /** Replay detections (DATA nonce replay) (16F.X5.X7.HARDENING). */
  replayDetected: number;
};

export type TransportSessionDebugSnapshot = {
  sessionId: string;
  pfsEnabled: boolean;
  rekeyMode: 'SYMMETRIC' | 'PFS';
  /** Effective policy mode from server options at handshake finalize. */
  pfsMode?: PfsMode;
  /** 16F.X5.X7 — last known lifecycle view for the active session. */
  sessionLifecycle?: {
    ageMs: number;
    bytesSent: number;
    bytesReceived: number;
    lastRekeyAt: number;
  };
  /** 16F.X5.X7.HARDENING — session control plane snapshot. */
  scp?: {
    state: 'STABLE' | 'REKEYING' | 'SWITCHING' | 'TERMINATED';
    rekeyEpoch: number;
    role: 'LEADER' | 'FOLLOWER' | 'NONE';
    rekeyInProgress: boolean;
  };
};

const metrics: SecureTransportMetricsSnapshot = {
  activeConnections: 0,
  activeSessions: 0,
  rekeys: 0,
  rejectedConnections: 0,
  rateLimited: 0,
  failedHandshakes: 0,
  replayAttacksDetected: 0,
  pfsSessions: 0,
  pfsFallbacks: 0,
  pfsStrictSessions: 0,
  pfsRejected: 0,
  pfsDowngradeAttempts: 0,
  sessionExpired: 0,
  rekeyTriggeredTime: 0,
  rekeyTriggeredData: 0,
  sessionTerminated: 0,
  rekeyCooldownBlocked: 0,
  rekeyCollisions: 0,
  dualKeyActive: 0,
  replayDetected: 0,
};

let lastSessionDebug: TransportSessionDebugSnapshot | null = null;

export function incMetric<K extends keyof SecureTransportMetricsSnapshot>(key: K, n = 1): void {
  metrics[key] += n;
}

export function setMetric<K extends keyof SecureTransportMetricsSnapshot>(key: K, v: number): void {
  metrics[key] = v;
}

export function getSecureTransportMetricsSnapshot(): SecureTransportMetricsSnapshot {
  return { ...metrics };
}

export function setTransportSessionDebug(snapshot: TransportSessionDebugSnapshot): void {
  lastSessionDebug = { ...snapshot };
}

export function getTransportSessionDebug(): TransportSessionDebugSnapshot | null {
  return lastSessionDebug ? { ...lastSessionDebug } : null;
}

/** Merge lifecycle fields into the last session debug snapshot (16F.X5.X7). */
export function patchTransportSessionLifecycleDebug(
  patch: Partial<Pick<TransportSessionDebugSnapshot, 'sessionLifecycle'>>,
): void {
  if (!lastSessionDebug) return;
  lastSessionDebug = { ...lastSessionDebug, ...patch };
}

export function patchTransportSessionScpDebug(
  patch: Partial<Pick<TransportSessionDebugSnapshot, 'scp'>>,
): void {
  if (!lastSessionDebug) return;
  lastSessionDebug = { ...lastSessionDebug, ...patch };
}

