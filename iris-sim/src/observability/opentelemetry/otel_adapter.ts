/**
 * Phase 16E.X2 — Push-based OTLP export pipeline (batch buffer via SpanSource).
 */

import type { OTelEventsConfig } from './otel_types.js';
import type { SpanSource } from '../span_source.js';
import { exportSpansToOtlpJson } from './otlp_exporter.js';
import { postOtlpJson } from './otlp_http.js';
import { mapIrisSpanToOtel } from './span_mapper.js';

export type OpenTelemetryAdapterOptions = {
  spanSource: SpanSource;
  endpoint: string;
  serviceName: string;
  flushIntervalMs: number;
  nodeId: string;
  /** Resolved event emission policy (merged with defaults). */
  events: Required<OTelEventsConfig>;
};

export class OpenTelemetryAdapter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private exportInFlight = false;

  constructor(private readonly opts: OpenTelemetryAdapterOptions) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      void this.exportNow();
    }, this.opts.flushIntervalMs);
  }

  /**
   * Stops periodic flush. Call {@link exportNow} before this for a shutdown flush.
   */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async exportNow(): Promise<void> {
    if (this.exportInFlight) return;
    this.exportInFlight = true;
    try {
      const batch = this.opts.spanSource.consume();
      const otel = batch
        .map((s) => mapIrisSpanToOtel(s, { nodeId: this.opts.nodeId, events: this.opts.events }))
        .filter((x): x is NonNullable<typeof x> => x != null);
      if (otel.length === 0) return;
      const body = exportSpansToOtlpJson(otel, this.opts.serviceName, this.opts.nodeId);
      await postOtlpJson(this.opts.endpoint, body);
    } finally {
      this.exportInFlight = false;
    }
  }
}
