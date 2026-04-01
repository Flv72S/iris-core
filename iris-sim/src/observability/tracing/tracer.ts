/**
 * Phase 16E — Lightweight tracer with optional nested stack.
 * Phase 16E.X3 — startSpan(name, { traceId?, parentSpanId?, ...metadata }).
 */

import { generateTraceId } from './trace_context.js';
import { Span } from './span.js';
import type { SpanModel } from './span.js';

export type StartSpanOptions = Record<string, unknown> & {
  traceId?: string;
  parentSpanId?: string;
};

export class Tracer {
  private readonly stack: Span[] = [];
  private readonly finished: SpanModel[] = [];
  private readonly maxFinished = 500;

  /**
   * @param options - Arbitrary metadata; `traceId` / `parentSpanId` drive distributed propagation.
   * If `traceId` is omitted, a new trace id is generated for this span.
   */
  startSpan(name: string, options?: StartSpanOptions): Span {
    const opts = options ?? {};
    const traceId = typeof opts.traceId === 'string' && opts.traceId.length > 0 ? opts.traceId : generateTraceId();
    const parentSpanId = typeof opts.parentSpanId === 'string' && opts.parentSpanId.length > 0 ? opts.parentSpanId : undefined;
    const { traceId: _t, parentSpanId: _p, ...rest } = opts;
    const metadata = Object.keys(rest).length > 0 ? rest : undefined;
    const span = new Span(name, {
      traceId,
      ...(parentSpanId !== undefined ? { parentSpanId } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    });
    this.stack.push(span);
    return span;
  }

  endSpan(span: Span, extra?: Record<string, unknown>): void {
    span.end(extra);
    const idx = this.stack.lastIndexOf(span);
    if (idx >= 0) this.stack.splice(idx, 1);
    this.recordFinished(span);
  }

  private recordFinished(span: Span): void {
    this.finished.push(span.toJSON());
    if (this.finished.length > this.maxFinished) {
      this.finished.splice(0, this.finished.length - this.maxFinished);
    }
  }

  exportSpans(): SpanModel[] {
    return [...this.finished];
  }

  /**
   * Drain finished spans for export pipelines (e.g. OTLP). Does not affect open spans.
   * Phase 16E.X2 — used by OpenTelemetry adapter to avoid duplicate exports.
   */
  consumeFinishedSpans(): SpanModel[] {
    const out = [...this.finished];
    this.finished.length = 0;
    return out;
  }

  getOpenSpanCount(): number {
    return this.stack.length;
  }

  reset(): void {
    this.stack.length = 0;
    this.finished.length = 0;
  }

  /**
   * Top of the active span stack (most recently started, still open).
   * Used for {@link getActiveTraceContext} and nested span parenting.
   */
  getCurrentSpan(): Span | undefined {
    if (this.stack.length === 0) return undefined;
    return this.stack[this.stack.length - 1];
  }
}
