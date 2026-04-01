/**
 * Microstep 16E.FINAL — Decouple OTLP export from Tracer implementation.
 */

import type { Tracer } from './tracing/tracer.js';
import type { IrisSpan } from './observability_contract.js';

export interface SpanSource {
  /** Drain finished spans for OTLP batch (same semantics as Tracer.consumeFinishedSpans). */
  consume(): IrisSpan[];
}

export function createTracerSpanSource(tracer: Tracer): SpanSource {
  return {
    consume: () => tracer.consumeFinishedSpans(),
  };
}
