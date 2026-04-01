/**
 * Phase 16E.X2 / 16E.X2.FINAL — OTLP JSON trace payload builder (strict shapes; no SDK).
 */

import type { OTelKeyValue, OTelSpan, OTelSpanEvent } from './otel_types.js';
import { mapAttributes } from './span_mapper.js';

function sortAttributes(attrs: OTelKeyValue[]): OTelKeyValue[] {
  return [...attrs].sort((a, b) => a.key.localeCompare(b.key));
}

function valueObjectToJson(v: OTelKeyValue['value']): {
  stringValue?: string;
  intValue?: number;
  boolValue?: boolean;
  doubleValue?: number;
} {
  const o: { stringValue?: string; intValue?: number; boolValue?: boolean; doubleValue?: number } = {};
  if (v.stringValue !== undefined) o.stringValue = v.stringValue;
  if (v.intValue !== undefined) o.intValue = v.intValue;
  if (v.boolValue !== undefined) o.boolValue = v.boolValue;
  if (v.doubleValue !== undefined) o.doubleValue = v.doubleValue;
  return o;
}

function keyValueToOtlpJson(kv: OTelKeyValue): { key: string; value: ReturnType<typeof valueObjectToJson> } {
  return { key: kv.key, value: valueObjectToJson(kv.value) };
}

function compareEventsByTime(a: OTelSpanEvent, b: OTelSpanEvent): number {
  const ta = BigInt(a.timeUnixNano);
  const tb = BigInt(b.timeUnixNano);
  if (ta < tb) return -1;
  if (ta > tb) return 1;
  return a.name.localeCompare(b.name);
}

function eventToOtlpJson(e: OTelSpanEvent): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: e.name,
    timeUnixNano: e.timeUnixNano,
  };
  if (e.attributes !== undefined && e.attributes.length > 0) {
    base.attributes = sortAttributes(e.attributes).map(keyValueToOtlpJson);
  }
  return base;
}

/** Sort spans by start time (nanoseconds string), then traceId, spanId, name. */
function compareSpansByStartTime(a: OTelSpan, b: OTelSpan): number {
  const na = BigInt(a.startTimeUnixNano);
  const nb = BigInt(b.startTimeUnixNano);
  if (na < nb) return -1;
  if (na > nb) return 1;
  if (a.traceId !== b.traceId) return a.traceId < b.traceId ? -1 : 1;
  if (a.spanId !== b.spanId) return a.spanId < b.spanId ? -1 : 1;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function statusToOtlpJson(s: OTelSpan['status']): Record<string, unknown> {
  const o: Record<string, unknown> = { code: s.code };
  if (s.message !== undefined && s.message.length > 0) {
    o.message = s.message;
  }
  return o;
}

function spanToOtlpJsonSpan(s: OTelSpan): Record<string, unknown> {
  const base: Record<string, unknown> = {
    traceId: s.traceId,
    spanId: s.spanId,
    name: s.name,
    kind: s.kind,
    startTimeUnixNano: s.startTimeUnixNano,
    endTimeUnixNano: s.endTimeUnixNano,
    attributes: sortAttributes(s.attributes).map(keyValueToOtlpJson),
    status: statusToOtlpJson(s.status),
  };
  if (s.parentSpanId !== undefined) {
    base.parentSpanId = s.parentSpanId;
  }
  if (s.events !== undefined && s.events.length > 0) {
    base.events = [...s.events].sort(compareEventsByTime).map(eventToOtlpJson);
  }
  return base;
}

function buildResourceAttributes(serviceName: string, nodeId: string): OTelKeyValue[] {
  return mapAttributes({
    'service.instance.id': nodeId,
    'service.name': serviceName,
    'telemetry.sdk.language': 'nodejs',
    'telemetry.sdk.name': 'iris',
  });
}

/**
 * Build a deterministic OTLP JSON trace payload (`resourceSpans` / `scopeSpans`).
 */
export function exportSpansToOtlpJson(spans: OTelSpan[], serviceName = 'iris-node', nodeId = 'unknown'): string {
  const ordered = [...spans].sort(compareSpansByStartTime);
  const resourceAttributes = buildResourceAttributes(serviceName, nodeId);

  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: resourceAttributes.map(keyValueToOtlpJson),
        },
        scopeSpans: [
          {
            scope: {
              name: 'iris',
              version: '0.1.0',
            },
            spans: ordered.map(spanToOtlpJsonSpan),
          },
        ],
      },
    ],
  };

  return JSON.stringify(payload);
}
