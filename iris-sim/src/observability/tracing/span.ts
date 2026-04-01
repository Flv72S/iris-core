/**
 * Phase 16E — Lightweight span.
 * Phase 16E.X3 — Optional distributed traceId / parentSpanId (OTel-ready).
 */

import { generateSpanId } from './trace_context.js';

export type SpanModel = {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  /** Distributed trace id when participating in a propagated trace. */
  traceId?: string;
  /** Parent span id in the distributed tree. */
  parentSpanId?: string;
  metadata?: Record<string, unknown>;
};

export type SpanInitOptions = {
  /** Reuse trace id across nodes. */
  traceId?: string;
  /** Parent span id from upstream (W3C / OTel semantics). */
  parentSpanId?: string;
  /** Optional explicit span id (otherwise generated). */
  spanId?: string;
  metadata?: Record<string, unknown>;
};

export class Span {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly traceId?: string;
  readonly parentSpanId?: string;
  endTime?: number;
  metadata?: Record<string, unknown>;

  constructor(name: string, opts?: SpanInitOptions) {
    this.id = opts?.spanId ?? generateSpanId();
    this.name = name;
    this.startTime = Date.now();
    if (opts?.traceId !== undefined) this.traceId = opts.traceId;
    if (opts?.parentSpanId !== undefined) this.parentSpanId = opts.parentSpanId;
    const meta = opts?.metadata;
    if (meta !== undefined && Object.keys(meta).length > 0) {
      this.metadata = meta;
    }
  }

  end(extra?: Record<string, unknown>): void {
    this.endTime = Date.now();
    if (extra && Object.keys(extra).length > 0) {
      const merged = { ...(this.metadata ?? {}), ...extra };
      this.metadata = merged;
    }
  }

  durationMs(): number | undefined {
    if (this.endTime == null) return undefined;
    return this.endTime - this.startTime;
  }

  toJSON(): SpanModel {
    return {
      id: this.id,
      name: this.name,
      startTime: this.startTime,
      ...(this.endTime !== undefined ? { endTime: this.endTime } : {}),
      ...(this.traceId !== undefined ? { traceId: this.traceId } : {}),
      ...(this.parentSpanId !== undefined ? { parentSpanId: this.parentSpanId } : {}),
      ...(this.metadata !== undefined ? { metadata: this.metadata } : {}),
    };
  }
}
