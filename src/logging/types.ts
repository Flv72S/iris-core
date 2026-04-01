/**
 * Core log line shape for IRIS logging (16F.1) and SDK/runtime (16F.5 / 16F.5.REVISION).
 *
 * ADR-003-B: use `audit.onFailure` and `invariantId` for compliance traceability.
 * SDK consumers: `src/sdk/runtime` — replay ordering is `timestamp` → `correlationId` → `replayOrdinal`;
 * returned arrays are deep-frozen for isolation.
 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export type RuntimePhase = 'INIT' | 'RUNTIME' | 'SNAPSHOT' | 'VALIDATION' | 'TEST';

export type InvariantId =
  | 'INV-001'
  | 'INV-002'
  | 'INV-003'
  | 'INV-004'
  | 'INV-005'
  | 'INV-006'
  | 'INV-007'
  | 'INV-008'
  | 'INV-009'
  | 'INV-010'
  | 'INV-011'
  | 'INV-012'
  | 'INV-013'
  | 'INV-014'
  | 'INV-015'
  | 'INV-016'
  | 'INV-017'
  | 'INV-018'
  | 'INV-019'
  | 'INV-020';

export type NonDeterministicMarker = 'ND-001' | 'ND-002' | 'ND-003' | 'ND-004' | 'ND-005' | 'ND-006';

export type OnFailurePolicy = 'LOG_ONLY' | 'WARN' | 'FAIL_FAST' | 'BLOCK_RUNTIME' | 'AUDIT_FLAG';

export type LogEntry = {
  timestamp: string; // ISO8601 UTC
  runtimeId: string;
  correlationId: string;
  level: LogLevel;
  phase: RuntimePhase;
  invariantId?: InvariantId;
  nondeterministicMarker?: NonDeterministicMarker;
  message: string;
  metadata?: Record<string, unknown>;
  audit: {
    compliant: boolean;
    onFailure?: OnFailurePolicy;
  };
};
