/**
 * Phase 16E.X3 — Distributed trace context (OpenTelemetry-compatible shape, no external deps).
 * Phase 16E.X3.FIX.2 — Execution-scoped trace isolation (stack, no global tracer singleton).
 */

import type { Span } from './span.js';

export type TraceContext = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
};

/** Minimal surface for active-context lookup (avoids circular imports with Tracer). */
export type ActiveSpanSource = {
  getCurrentSpan(): Span | undefined;
};

type TraceContextStack = ActiveSpanSource[];

/** LIFO stack of tracers for nested {@link runWithTraceContext}; not exported. */
const tracerStack: TraceContextStack = [];

/**
 * Run `fn` with `tracer` as the innermost active source for {@link getActiveTraceContext}.
 * Synchronous only; use {@link runWithTraceContextAsync} for async work.
 */
export function runWithTraceContext<T>(tracer: ActiveSpanSource, fn: () => T): T {
  tracerStack.push(tracer);
  try {
    return fn();
  } finally {
    tracerStack.pop();
  }
}

/**
 * Async variant: keeps the tracer on the stack until the returned promise settles.
 */
export async function runWithTraceContextAsync<T>(tracer: ActiveSpanSource, fn: () => Promise<T>): Promise<T> {
  tracerStack.push(tracer);
  try {
    return await fn();
  } finally {
    tracerStack.pop();
  }
}

/**
 * Current trace context from the innermost scoped tracer and its current span.
 */
export function getActiveTraceContext(): TraceContext | undefined {
  const tracer = tracerStack[tracerStack.length - 1];
  if (!tracer) return undefined;

  const span = tracer.getCurrentSpan();
  if (!span) return undefined;

  const traceId = span.traceId;
  if (typeof traceId !== 'string' || traceId.length === 0) return undefined;

  return {
    traceId,
    spanId: span.id,
    ...(span.parentSpanId !== undefined && span.parentSpanId.length > 0 ? { parentSpanId: span.parentSpanId } : {}),
  };
}

let _seq = 0;

function nextPart(): string {
  const n = _seq++;
  if (n === Number.MAX_SAFE_INTEGER) _seq = 0;
  return n.toString(36);
}

/**
 * Collision-resistant enough for process-local and cross-node correlation:
 * time (base36) + monotonic counter + random suffix.
 */
export function generateTraceId(): string {
  return `t${Date.now().toString(36)}${nextPart()}${Math.random().toString(36).slice(2, 14)}`;
}

export function generateSpanId(): string {
  return `s${Date.now().toString(36)}${nextPart()}${Math.random().toString(36).slice(2, 12)}`;
}

export function isValidTraceContext(value: unknown): value is TraceContext {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (typeof o.traceId !== 'string' || o.traceId.length === 0) return false;
  if (typeof o.spanId !== 'string' || o.spanId.length === 0) return false;
  if (o.parentSpanId !== undefined && typeof o.parentSpanId !== 'string') return false;
  return true;
}
