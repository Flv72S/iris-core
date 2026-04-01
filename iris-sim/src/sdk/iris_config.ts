/**
 * Microstep 16A — IRIS SDK configuration.
 */

import type { OTelEventsConfig } from '../observability/opentelemetry/otel_types.js';

export type { OTelEventsConfig };

export type TransportConfig = {
  type: 'ws' | 'grpc' | 'http' | 'inmemory';
  options?: unknown;
};

export type SecurityConfig = {
  encryption?: boolean;
  replay_protection?: boolean;
};

/** Phase 16E.X1 — optional Prometheus text `/metrics` HTTP server. */
export type PrometheusExporterConfig = {
  enabled: boolean;
  /** Default 9464. */
  port?: number;
};

/** Phase 16E.X2 — OpenTelemetry OTLP HTTP JSON bridge (adapter only; no OTel SDK). */
export type OpenTelemetryObservabilityConfig = {
  /** Default false. */
  enabled?: boolean;
  /** OTLP HTTP JSON endpoint. Default `http://localhost:4318/v1/traces`. */
  endpoint?: string;
  /** `service.name` resource attribute. Default `iris-node`. */
  serviceName?: string;
  /** Adapter flush interval (ms). Default 5000. */
  flushIntervalMs?: number;
  /** Span event emission policy (OTLP). Merged with defaults. */
  events?: OTelEventsConfig;
};

/** Microstep 16D — push observability snapshots to a control plane HTTP endpoint. */
export type ControlPlaneConfig = {
  enabled?: boolean;
  /** Base URL, e.g. `http://127.0.0.1:9470` (appends `/ingest`). */
  endpoint?: string;
  /** Push interval in ms. Default 15000. */
  intervalMs?: number;
};

/**
 * Microstep 16D.X1 — HMAC authentication to control plane (shared secret, ≥32 UTF-8 bytes).
 * When `enabled`, requests are signed; control plane must have the same secret registered.
 */
export type NodeSecurityConfig = {
  enabled?: boolean;
  nodeSecret?: string;
  /** Optional staged secret during control-plane rotation (fallback signer). */
  nextSecret?: string;
};

export type ObservabilityConfig = {
  /** Master switch: false disables all observability subsystems. Default true. */
  enabled?: boolean;
  /** Structured logging (JSON lines + optional file). Default true. */
  logging?: boolean;
  /** In-memory Prometheus-style metrics. Default true. */
  metrics?: boolean;
  /** Lightweight span tracing. Default true. */
  tracing?: boolean;
  /** Metrics-based alerting (requires metrics). Default true. */
  alerting?: boolean;
  /** Minimum log level (also overridable via IRIS_LOG_LEVEL). */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Pretty stdout (CLI); JSON lines when false. */
  pretty?: boolean;
  /** Working directory for `.iris/` outputs. Default `process.cwd()`. */
  cwd?: string;
  /** Expose Prometheus scrape endpoint when metrics enabled. */
  prometheus?: PrometheusExporterConfig;
  /** OTLP-compatible trace export (HTTP JSON). Default off. */
  otel?: OpenTelemetryObservabilityConfig;
};

export type IrisConfig = {
  node_id: string;

  transport?: TransportConfig;
  security?: SecurityConfig;

  dev_mode?: boolean;

  features?: {
    encryption?: boolean;
    replay_protection?: boolean;
    covenants?: boolean;
  };

  /** Phase 16E — observability (zero-config defaults: all on). */
  observability?: ObservabilityConfig;

  /** Microstep 16D — optional control plane registration (HTTP ingest). */
  controlPlane?: ControlPlaneConfig;

  /** Microstep 16D.X1 — optional signed ingest to control plane (orthogonal to transport `security`). */
  nodeSecurity?: NodeSecurityConfig;

  /** Phase 16F.X8 — canonical runtime convergence profile (defaults enforced by IrisNode). */
  runtime?: {
    allowLegacy?: boolean;
    transport?: { secure?: boolean };
    gossip?: { enabled?: boolean };
    crdt?: { enabled?: boolean };
    federation?: { enabled?: boolean };
    observability?: { snapshotIntervalMs?: number };
  };
};

export type IrisConfigDefaults = Required<Pick<IrisConfig, 'dev_mode'>> & Partial<IrisConfig>;

