export type { SecureConnection, RekeyTriggerReason } from './secure_connection.js';
export type { TransportSession } from './transport_session.js';
export { buildTlsContext, type TlsContext } from './tls_context.js';
export type { SessionState } from './session_state.js';

export { SecureTransportServerImpl } from './secure_server.js';
export { SecureTransportClientImpl } from './secure_client.js';

export type { SecureTransportClient } from './secure_client.js';
export type { SecureTransportServer } from './secure_server.js';

export type { ReplayGuard } from './replay_protection.js';
export { TtlNonceReplayGuard } from './replay_protection.js';

export type { TransportTrustEngineLike, TransportTrustLevel } from './transport_trust_enforcement.js';
export { enforceConnectionTrust, enforceSendPermission } from './transport_trust_enforcement.js';

export {
  getSecureTransportMetricsSnapshot,
  setTransportSessionDebug,
  getTransportSessionDebug,
  patchTransportSessionLifecycleDebug,
  patchTransportSessionScpDebug,
  type SecureTransportMetricsSnapshot,
  type TransportSessionDebugSnapshot,
} from './transport_metrics.js';
export type { TransportAuditHook, TransportAuditEvent, TransportAuditType } from './audit_hooks.js';

export {
  buildPfsEphemeralSignatureHash,
  signPfsEphemeralBinding,
  verifyPfsEphemeralBinding,
} from './handshake_protocol.js';

export type { EphemeralKeyPair } from './pfs_keys.js';
export { generateEphemeralKeyPair, deriveSharedSecret, validateX25519PublicKeyRaw, zeroBuffer } from './pfs_keys.js';
export type { PfsHandshakeKdfContext, PfsRekeyKdfContext } from './pfs_kdf.js';
export { deriveSessionKey, deriveRekeySessionKey, buildPfsHandshakeContextDigest } from './pfs_kdf.js';
export type {
  TransportSecurityPolicy,
  PfsMode,
  SessionLifecyclePolicy,
  ResolvedSessionLifecycle,
} from './transport_policy.js';
export {
  effectiveRequiresPfs,
  isStrictPfs,
  resolvePfsMode,
  resolveSessionLifecyclePolicy,
  DEFAULT_MAX_SESSION_DURATION_MS,
  DEFAULT_REKEY_INTERVAL_MS,
  DEFAULT_MAX_BYTES_PER_KEY,
} from './transport_policy.js';
export { createSecureConnection } from './secure_connection.js';
export { secureZero } from './pfs_zero.js';

export type { SessionControlPlane } from './session_control_plane.js';
export {
  createSessionControlPlane,
  electRekeyLeader,
  resolveRekeyRole,
  canTriggerRekey,
  resolveRekeyCollision,
  transitionSessionState,
  encodeSessionTicket,
  decodeSessionTicket,
} from './session_control_plane.js';

