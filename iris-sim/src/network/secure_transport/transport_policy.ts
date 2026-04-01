/**
 * Transport security policy (16F.X5.X6.HARDENING — PFS enforcement).
 */

export type PfsMode = 'OPTIONAL' | 'REQUIRED' | 'STRICT';

/** Optional caps and PFS policy merged into server/client secure transport options. */
export type TransportSecurityPolicy = {
  maxConnections?: number;
  rateLimit?: { messagesPerSecond?: number; bytesPerSecond?: number };
  allowDomains?: string[];
  denyDomains?: string[];
  /**
   * When true, peers must complete ECDHE+PFS handshakes; legacy transport keys are rejected.
   * Default false (backward compatible). Superseded by {@link pfsMode} when set to REQUIRED/STRICT.
   */
  requirePfs?: boolean;
  /**
   * OPTIONAL — legacy fallback allowed when peer omits PFS.
   * REQUIRED — handshake fails without PFS.
   * STRICT — same as REQUIRED plus strict validation (no ambiguous downgrade paths).
   */
  pfsMode?: PfsMode;
  /** Test-only: corrupt PFS rekey HMAC. */
  debugTamperRekeyResponse?: boolean;
  /**
   * Test-only: ignore client PFS offer and complete a legacy handshake (downgrade simulation).
   * Ignored unless present on server policy.
   */
  debugForceLegacyHandshake?: boolean;
  /**
   * Session lifetime, rekey cadence, and key material limits (16F.X5.X7).
   * When present (including `{}`), defaults apply for omitted fields.
   */
  sessionLifecycle?: SessionLifecyclePolicy;
  /**
   * 16F.X5.X7.HARDENING — traffic behavior while REKEYING.
   * Default ALLOW for backward compatibility.
   */
  trafficDuringRekey?: 'BLOCK' | 'ALLOW';
  /**
   * 16F.X5.X7.HARDENING — optional session resumption support (feature-flag).
   * Default false.
   */
  enableSessionResumption?: boolean;
};

/** 16F.X5.X7 — session wall-clock, rekey interval, and per-key byte caps. */
export type SessionLifecyclePolicy = {
  /** Max wall-clock session age from {@link TransportSession.createdAt}. */
  maxSessionDurationMs?: number;
  /** Rotate keys on this cadence (continuous forward secrecy). */
  rekeyIntervalMs?: number;
  /** Max ciphertext bytes sent with one channel key before mandatory rekey. */
  maxBytesPerKey?: number;
  /** Max time waiting for REKEY_RESPONSE before abort (STRICT uses a tighter default). */
  rekeyPendingTimeoutMs?: number;
};

export const DEFAULT_MAX_SESSION_DURATION_MS = 15 * 60 * 1000;
export const DEFAULT_REKEY_INTERVAL_MS = 5 * 60 * 1000;
export const DEFAULT_MAX_BYTES_PER_KEY = 10 * 1024 * 1024;

export type ResolvedSessionLifecycle = {
  maxSessionDurationMs: number;
  rekeyIntervalMs: number;
  maxBytesPerKey: number;
  rekeyPendingTimeoutMs: number;
};

/** Merge policy with defaults (16F.X5.X7). */
export function resolveSessionLifecyclePolicy(
  sl: SessionLifecyclePolicy | undefined,
  pfsMode?: PfsMode,
): ResolvedSessionLifecycle {
  return {
    maxSessionDurationMs: sl?.maxSessionDurationMs ?? DEFAULT_MAX_SESSION_DURATION_MS,
    rekeyIntervalMs: sl?.rekeyIntervalMs ?? DEFAULT_REKEY_INTERVAL_MS,
    maxBytesPerKey: sl?.maxBytesPerKey ?? DEFAULT_MAX_BYTES_PER_KEY,
    rekeyPendingTimeoutMs:
      sl?.rekeyPendingTimeoutMs ?? (pfsMode === 'STRICT' ? 30_000 : 60_000),
  };
}

export function resolvePfsMode(ts?: TransportSecurityPolicy): PfsMode {
  if (ts?.pfsMode) return ts.pfsMode;
  if (ts?.requirePfs) return 'REQUIRED';
  return 'OPTIONAL';
}

/** True when the peer must use PFS (requirePfs or pfsMode REQUIRED/STRICT). */
export function effectiveRequiresPfs(ts?: TransportSecurityPolicy): boolean {
  if (!ts) return false;
  if (ts.pfsMode === 'REQUIRED' || ts.pfsMode === 'STRICT') return true;
  return ts.requirePfs === true;
}

export function isStrictPfs(ts?: TransportSecurityPolicy): boolean {
  return ts?.pfsMode === 'STRICT';
}
