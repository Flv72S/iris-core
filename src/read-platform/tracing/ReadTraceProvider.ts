/**
 * Read Trace Provider — PROVIDER PURO (creazione e derivazione contesto)
 * Crea e deriva trace context. Nessuna dipendenza esterna, nessun side-effect.
 */

import type { ReadTraceContext } from './ReadTraceContext';

function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Porta per creazione e derivazione di trace context.
 */
export interface ReadTraceProvider {
  createRoot(): ReadTraceContext;
  createChild(parent: ReadTraceContext, spanId: string): ReadTraceContext;
}

/**
 * Implementazione default: createRoot genera traceId, createChild deriva mantenendo traceId.
 */
export class DefaultReadTraceProvider implements ReadTraceProvider {
  createRoot(): ReadTraceContext {
    return {
      traceId: generateTraceId(),
    };
  }

  createChild(parent: ReadTraceContext, spanId: string): ReadTraceContext {
    return {
      traceId: parent.traceId,
      spanId,
      parentSpanId: parent.spanId,
    };
  }
}
