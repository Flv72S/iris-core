/**
 * Microstep 16E.FINAL — Unified observability contract (single source of truth).
 */

import type { AlertInstance } from './alerting/alert_types.js';
import type { StandardMetricsSnapshot } from './metrics/metrics_types.js';
import type { SpanModel } from './tracing/span.js';

/** Canonical finished span shape (IRIS tracing model). */
export type IrisSpan = SpanModel;

/**
 * Full node observability snapshot for persistence, CLI, and downstream control planes.
 * Optional sections omitted when the corresponding layer is disabled (no `undefined` in JSON).
 */
export type IrisObservabilitySnapshot = {
  node: {
    id: string;
    timestamp: number;
    uptime_seconds: number;
  };
  metrics: StandardMetricsSnapshot;
  traces?: {
    spans: IrisSpan[];
  };
  alerts?: {
    active: AlertInstance[];
  };
  /** Populated when `.iris/trust_audit.log` is present and readable (shallow chain check). */
  audit?: {
    totalRecords: number;
    chainValid: boolean;
    lastRecordHash: string;
    /** Present on new snapshots (16F.X2+). */
    merkleRoot?: string;
  };
  /** From `.iris/sync_metrics.json` when distributed sync persists metrics. */
  sync?: {
    peers: number;
    divergences: number;
  };
  /** From `.iris/sync_metrics.json` federation metrics (16F.X4). */
  federation?: {
    domainId: string;
    peersByDomain: Record<string, number>;
    rejectedByPolicy: number;
    /** Deterministic list of known domain IDs when available. */
    domainsRegistered?: string[];
  };
  /** From `.iris/sync_metrics.json` federation hardening metrics (16F.X4.HARDENING). */
  federationSecurity?: {
    revokedDomainAttempts: number;
    negotiationFailures: number;
    trustLevelEnforcements: Record<string, number>;
    /**
     * Reserved for forward-compatibility with a placeholder metric name.
     * (Some historical snapshots may have used this key.)
     */
    rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo?: number;
  };
  /** From `.iris/trust_snapshot.json` (16F.X4.X5). */
  trust?: {
    domains: number;
    revoked: number;
    lastUpdate: number;
    driftDetected: boolean;
  };
  /** Secure transport metrics (16F.X5.HARDENING). */
  transport?: {
    activeConnections: number;
    activeSessions: number;
    rekeys: number;
    rejectedConnections: number;
    rateLimited: number;
    failedHandshakes: number;
    replayAttacksDetected: number;
    pfsSessions: number;
    pfsFallbacks: number;
    pfsStrictSessions: number;
    pfsRejected: number;
    pfsDowngradeAttempts: number;
    sessionExpired: number;
    rekeyTriggeredTime: number;
    rekeyTriggeredData: number;
    sessionTerminated: number;
    rekeyCollisions: number;
    rekeyCooldownBlocked: number;
    dualKeyActive: number;
    replayDetected: number;
  };
  /** Secure gossip metrics + state (16F.X6). */
  gossip?: {
    messagesReceived: number;
    messagesForwarded: number;
    duplicatesDropped: number;
    rateLimited: number;
    blockedAmplifications: number;
    inflightLimitExceeded: number;
    policyViolations: number;
    lineageInvalid: number;
    replayDetected: number;
    convergenceStalled: number;
  };
  gossipState?: {
    peersCount: number;
    activePeers: number;
  };
  gossipControl?: {
    inflight: number;
    blockedAmplifications: number;
    fanoutAverage: number;
  };
  gossipConsistency?: {
    convergenceRate: number;
    partialMessages: number;
  };
  crdt?: {
    operationsApplied: number;
    operationsRejected: number;
    conflictsResolved: number;
    stateSize: number;
    convergenceRate: number;
  };
  runtime?: {
    state: 'INITIALIZING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR';
    bootStartedAt?: number;
    updatedAt: string;
    errors: number;
    activeComponents: number;
    /** Deterministic sorted runtime component names. */
    activeComponentsList?: string[];
    /** Last init phase attempted by runtime pipeline. */
    lastInitPhase?: string;
    /** Last init phase status. */
    lastInitPhaseStatus?: 'OK' | 'FAILED';
    /** Phase name that failed most recently. */
    lastInitErrorPhase?: string;
  };
  /** From `.iris/node_identity.json` when `iris keys generate` has been run (16F.X1+). */
  identity?: {
    nodeId: string;
    publicKey: string;
    keyTypes: string[];
    /** SHA-256 hex of canonical SPKI DER (16F.X1.X2.HARDENING). */
    publicKeyFingerprint: string;
    /** e.g. `spki_der_v1` when present on disk. */
    canonicalIdentity?: string;
  };
};

/** Official metric keys (registry + alerts must reference these). */
export const IRIS_OFFICIAL_METRIC_KEYS = [
  'messages_sent',
  'messages_received',
  'active_sessions',
  'node_uptime_seconds',
] as const;
