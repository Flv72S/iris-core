/**
 * Read Trace Context — CONTESTO IMMUTABILE (correlazione, non logging/metrics)
 * Correla logicamente operazioni del read-side. Passaggio esplicito, no AsyncLocalStorage.
 */

/**
 * Contesto di tracing immutabile.
 */
export interface ReadTraceContext {
  readonly traceId: string;
  readonly spanId?: string;
  readonly parentSpanId?: string;
}
