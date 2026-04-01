/**
 * Phase 16E.X2 / 16E.X2.FINAL — OTLP-aligned types (adapter layer; not full SDK).
 */

/** Numeric span kind (OpenTelemetry proto–compatible). */
export const SpanKind = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
} as const;

/** OTLP StatusCode (protobuf enum values). */
export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
} as const;

/**
 * OTLP JSON key-value (protobuf JSON encoding for AnyValue variants used here).
 */
export type OTelKeyValue = {
  key: string;
  value: {
    stringValue?: string;
    intValue?: number;
    boolValue?: boolean;
    doubleValue?: number;
  };
};

export type OTelSpanStatus = {
  code: number;
  message?: string;
};

export type OTelSpanEvent = {
  name: string;
  timeUnixNano: string;
  attributes?: OTelKeyValue[];
};

/**
 * Policy for OTLP span event emission (lifecycle + exception events).
 * Defaults preserve full semantic behavior; tune for volume/cost.
 */
export type OTelEventsConfig = {
  enabled?: boolean;
  includeLifecycle?: boolean;
  includeExceptions?: boolean;
};

export const DEFAULT_OTEL_EVENTS_CONFIG: Required<OTelEventsConfig> = {
  enabled: true,
  includeLifecycle: true,
  includeExceptions: true,
};

/**
 * Minimal span for OTLP JSON export.
 * traceId: 32 lowercase hex chars (16 bytes).
 * spanId / parentSpanId: 16 lowercase hex chars (8 bytes).
 * Timestamps: nanoseconds as decimal string (no float precision loss).
 * status: always set (semantic layer; default OK).
 */
export type OTelSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OTelKeyValue[];
  status: OTelSpanStatus;
  events?: OTelSpanEvent[];
};
