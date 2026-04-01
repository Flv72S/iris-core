/**
 * Phase 16E.X2 — Resolve OpenTelemetry adapter settings from Iris observability config.
 */

import type { OpenTelemetryObservabilityConfig } from '../../sdk/iris_config.js';
import { DEFAULT_OTEL_EVENTS_CONFIG, type OTelEventsConfig } from './otel_types.js';

export const OTEL_DEFAULTS = {
  endpoint: 'http://localhost:4318/v1/traces',
  serviceName: 'iris-node',
  flushIntervalMs: 5000,
} as const;

export type ResolvedOtelConfig = {
  enabled: boolean;
  endpoint: string;
  serviceName: string;
  flushIntervalMs: number;
  events: Required<OTelEventsConfig>;
};

export function resolveOtelConfig(input: Partial<OpenTelemetryObservabilityConfig> | undefined): ResolvedOtelConfig {
  const o = input;
  const events: Required<OTelEventsConfig> = {
    ...DEFAULT_OTEL_EVENTS_CONFIG,
    ...o?.events,
  };
  return {
    enabled: Boolean(o?.enabled),
    endpoint: o?.endpoint ?? OTEL_DEFAULTS.endpoint,
    serviceName: o?.serviceName ?? OTEL_DEFAULTS.serviceName,
    flushIntervalMs: o?.flushIntervalMs ?? OTEL_DEFAULTS.flushIntervalMs,
    events,
  };
}
