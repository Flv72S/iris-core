/**
 * Phase 16E — Bridge IRIS SDK events to logging / metrics / tracing.
 */

import type { StructuredIrisLogger } from '../logger/iris_logger.js';
import type { MetricsRegistry } from '../metrics/metrics_registry.js';
import type { Tracer } from '../tracing/tracer.js';
import { isValidTraceContext } from '../tracing/trace_context.js';
import type { IrisEvent } from '../../sdk/iris_events.js';

export type ObservabilityFlags = {
  logging: boolean;
  metrics: boolean;
  tracing: boolean;
};

export type ObservabilityBridgeDeps = {
  nodeId: string;
  flags: ObservabilityFlags;
  logger: StructuredIrisLogger | null;
  metrics: MetricsRegistry | null;
  tracer: Tracer | null;
};

type Handler = (payload: unknown) => void;

export class ObservabilityBridge {
  private readonly deps: ObservabilityBridgeDeps;

  constructor(deps: ObservabilityBridgeDeps) {
    this.deps = deps;
  }

  /** Subscribe using IrisNode.on — returns unsubscribe function list for tests. */
  wire(on: (event: IrisEvent, handler: Handler) => void): void {
    const { flags, logger, metrics, tracer, nodeId } = this.deps;

    const onReady: Handler = () => {
      if (flags.logging && logger) {
        logger.info('node:ready', { event: 'node:ready', nodeId });
      }
      if (flags.metrics && metrics) {
        metrics.gauge('active_sessions', 1);
      }
      if (flags.tracing && tracer) {
        const s = tracer.startSpan('node_ready', { nodeId });
        tracer.endSpan(s, { ok: true });
      }
    };

    const onMessage: Handler = (payload) => {
      const p = payload as { type?: string; meta?: { trace?: unknown } };
      const trace = p?.meta?.trace;
      if (flags.logging && logger) {
        const meta: Record<string, unknown> = { event: 'message', nodeId, messageType: p?.type };
        if (isValidTraceContext(trace)) {
          meta.traceId = trace.traceId;
          meta.spanId = trace.spanId;
          if (trace.parentSpanId) meta.parentSpanId = trace.parentSpanId;
        }
        logger.info('message', meta);
      }
      if (flags.metrics && metrics) {
        metrics.increment('messages_received');
      }
      if (flags.tracing && tracer) {
        // IrisNode already records message_receive when meta.trace is present; avoid duplicate spans.
        if (!isValidTraceContext(trace)) {
          const s = tracer.startSpan('message', { nodeId });
          tracer.endSpan(s, { phase: 'event' });
        }
      }
    };

    const onError: Handler = (payload) => {
      if (flags.logging && logger) {
        logger.error('error', { event: 'error', nodeId, payload });
      }
    };

    on('node:ready', onReady);
    on('message', onMessage);
    on('error', onError);
  }
}
