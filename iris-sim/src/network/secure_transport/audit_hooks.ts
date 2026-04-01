export type TransportAuditType =
  | 'TRANSPORT_CONNECT'
  | 'TRANSPORT_HANDSHAKE_OK'
  | 'TRANSPORT_REKEY'
  | 'TRANSPORT_CLOSE'
  | 'TRANSPORT_VIOLATION'
  | 'PFS_SESSION_ESTABLISHED'
  | 'PFS_REKEY'
  | 'PFS_FALLBACK'
  | 'PFS_POLICY_ENFORCED'
  | 'PFS_EPHEMERAL_AUTH'
  | 'PFS_STRICT_MODE'
  | 'PFS_DOWNGRADE_BLOCKED'
  | 'PFS_CONTEXT_BOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_TERMINATED'
  | 'KEY_EXHAUSTION'
  | 'PFS_REKEY_TRIGGERED'
  | 'PFS_CONTINUOUS_ENFORCED'
  | 'REKEY_LEADER_ELECTED'
  | 'REKEY_COLLISION_RESOLVED'
  | 'DUAL_KEY_WINDOW_ACTIVE'
  | 'REPLAY_DETECTED'
  | 'SESSION_STATE_TRANSITION'
  | 'SESSION_RESUMED';

export type TransportAuditEvent = {
  type: TransportAuditType;
  timestamp: number;
  sessionId?: string;
  peerNodeId?: string;
  peerDomainId?: string;
  meta?: Record<string, unknown>;
};

export type TransportAuditHook = (event: TransportAuditEvent) => void;

