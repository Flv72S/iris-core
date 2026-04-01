/**
 * Phase 16E.X2 / 16E.X2.FINAL — Map IRIS Span / SpanModel to minimal OTelSpan (no mutation).
 */

import { createHash } from 'node:crypto';

import { Span, type SpanModel } from '../tracing/span.js';
import {
  DEFAULT_OTEL_EVENTS_CONFIG,
  SpanKind,
  SpanStatusCode,
  type OTelEventsConfig,
  type OTelKeyValue,
  type OTelSpan,
  type OTelSpanEvent,
  type OTelSpanStatus,
} from './otel_types.js';

function toModel(span: Span | SpanModel): SpanModel {
  return span instanceof Span ? span.toJSON() : span;
}

/**
 * Deterministic hex id: SHA-256 digest truncated to `bytes` bytes → lowercase hex (2 hex chars per byte).
 */
export function toHexId(input: string, bytes: number): string {
  const digest = createHash('sha256').update(input, 'utf8').digest();
  return digest.subarray(0, bytes).toString('hex');
}

/** OTLP trace id: 16 bytes → 32 hex chars. */
export function irisTraceIdToOtlpTraceId(irisTraceId: string): string {
  return toHexId(irisTraceId, 16);
}

/** OTLP span id: 8 bytes → 16 hex chars. */
export function irisSpanIdToOtlpSpanId(irisSpanId: string): string {
  return toHexId(irisSpanId, 8);
}

function inferKind(name: string): number {
  if (name === 'message_receive' || name.includes('receive')) return SpanKind.SERVER;
  if (name === 'message_send' || name.includes('send')) return SpanKind.CLIENT;
  return SpanKind.INTERNAL;
}

/** Milliseconds (epoch) → Unix nanoseconds string via BigInt (no floating-point loss). */
export function msToUnixNanoString(ms: number): string {
  if (!Number.isFinite(ms)) return '0';
  const integral = ms < 0 ? Math.ceil(ms) : Math.floor(ms);
  return (BigInt(integral) * 1_000_000n).toString();
}

/**
 * Map a plain attribute bag to OTLP key-values: sorted keys, no null/undefined, deterministic.
 * Numbers: safe integers → intValue; other finite numbers → doubleValue; NaN/Infinity → stringValue.
 */
export function mapAttributes(input: Record<string, unknown>): OTelKeyValue[] {
  const keys = Object.keys(input).sort((a, b) => a.localeCompare(b));
  const out: OTelKeyValue[] = [];
  for (const key of keys) {
    const v = input[key];
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') {
      out.push({ key, value: { stringValue: v } });
    } else if (typeof v === 'boolean') {
      out.push({ key, value: { boolValue: v } });
    } else if (typeof v === 'number') {
      if (!Number.isFinite(v) || Number.isNaN(v)) {
        out.push({ key, value: { stringValue: String(v) } });
      } else if (Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER) {
        out.push({ key, value: { intValue: v } });
      } else if (Number.isInteger(v)) {
        out.push({ key, value: { stringValue: String(v) } });
      } else {
        out.push({ key, value: { doubleValue: v } });
      }
    } else {
      try {
        out.push({ key, value: { stringValue: JSON.stringify(v) } });
      } catch {
        // ignore unsupported / circular
      }
    }
  }
  return out;
}

function deriveSpanStatus(metadata: Record<string, unknown> | undefined): OTelSpanStatus {
  if (!metadata || typeof metadata !== 'object') {
    return { code: SpanStatusCode.OK };
  }
  const err = metadata.error;
  if (err === true) {
    const msg =
      typeof metadata.message === 'string' && metadata.message.length > 0
        ? metadata.message
        : typeof metadata.exception === 'string' && metadata.exception.length > 0
          ? metadata.exception
          : 'error';
    return { code: SpanStatusCode.ERROR, message: msg };
  }
  if (typeof err === 'string' && err.length > 0) {
    return { code: SpanStatusCode.ERROR, message: err };
  }
  if (metadata.status === 'error') {
    const msg = typeof metadata.message === 'string' && metadata.message.length > 0 ? metadata.message : 'error';
    return { code: SpanStatusCode.ERROR, message: msg };
  }
  if (metadata.exception != null && metadata.exception !== false) {
    const msg =
      typeof metadata.exception === 'string'
        ? metadata.exception
        : typeof metadata.message === 'string'
          ? metadata.message
          : 'exception';
    return { code: SpanStatusCode.ERROR, message: msg };
  }
  return { code: SpanStatusCode.OK };
}

function compareEvents(a: OTelSpanEvent, b: OTelSpanEvent): number {
  const ta = BigInt(a.timeUnixNano);
  const tb = BigInt(b.timeUnixNano);
  if (ta < tb) return -1;
  if (ta > tb) return 1;
  return a.name.localeCompare(b.name);
}

function resolveEventsConfig(user?: OTelEventsConfig): Required<OTelEventsConfig> {
  return {
    ...DEFAULT_OTEL_EVENTS_CONFIG,
    ...user,
  };
}

function buildSpanEvents(
  startNs: string,
  endNs: string,
  status: OTelSpanStatus,
  cfg: Required<OTelEventsConfig>,
): OTelSpanEvent[] | undefined {
  if (!cfg.enabled) {
    return undefined;
  }
  const events: OTelSpanEvent[] = [];
  const isError =
    status.code === SpanStatusCode.ERROR && status.message !== undefined && status.message.length > 0;

  if (cfg.includeLifecycle) {
    events.push({ name: 'span.start', timeUnixNano: startNs }, { name: 'span.end', timeUnixNano: endNs });
  }
  if (cfg.includeExceptions && isError) {
    events.push({
      name: 'exception',
      timeUnixNano: endNs,
      attributes: mapAttributes({ 'exception.message': status.message! }),
    });
  }

  if (events.length === 0) {
    return undefined;
  }
  return events.sort(compareEvents);
}

export type MapIrisSpanToOtelOpts = {
  nodeId?: string;
  /** Merged with {@link DEFAULT_OTEL_EVENTS_CONFIG}. */
  events?: OTelEventsConfig;
};

/**
 * Map a finished IRIS span to {@link OTelSpan}. Open spans without `endTime` use `startTime` for end (edge case).
 */
export function mapIrisSpanToOtel(span: Span | SpanModel, opts?: MapIrisSpanToOtelOpts): OTelSpan | null {
  const m = toModel(span);
  const traceIdSrc = m.traceId ?? '';
  if (traceIdSrc.length === 0) return null;

  const startMs = m.startTime;
  let endMs = m.endTime ?? m.startTime;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs < startMs) endMs = startMs;

  const traceId = irisTraceIdToOtlpTraceId(traceIdSrc);
  const spanId = irisSpanIdToOtlpSpanId(m.id);
  const parentSpanId = m.parentSpanId ? irisSpanIdToOtlpSpanId(m.parentSpanId) : undefined;

  const durationMs = endMs - startMs;
  const meta = m.metadata && typeof m.metadata === 'object' ? (m.metadata as Record<string, unknown>) : undefined;
  const status = deriveSpanStatus(meta);

  const raw: Record<string, unknown> = {
    'iris.duration_ms': durationMs,
    'iris.span_name': m.name,
    'iris.trace_id': traceIdSrc,
    'iris.span_id': m.id,
  };
  if (opts?.nodeId !== undefined) {
    raw['iris.node_id'] = opts.nodeId;
  }
  if (m.parentSpanId !== undefined) {
    raw['iris.parent_span_id'] = m.parentSpanId;
  }

  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      raw[`iris.meta.${k}`] = v as unknown;
    }
  }

  const attributes = mapAttributes(raw);

  const startNs = msToUnixNanoString(startMs);
  const endNs = msToUnixNanoString(endMs);
  const eventsCfg = resolveEventsConfig(opts?.events);
  const events = buildSpanEvents(startNs, endNs, status, eventsCfg);

  return {
    traceId,
    spanId,
    ...(parentSpanId !== undefined ? { parentSpanId } : {}),
    name: m.name,
    kind: inferKind(m.name),
    startTimeUnixNano: startNs,
    endTimeUnixNano: endNs,
    attributes,
    status,
    ...(events !== undefined ? { events } : {}),
  };
}
