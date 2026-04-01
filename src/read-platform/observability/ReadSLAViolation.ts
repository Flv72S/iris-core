/**
 * Read SLA Violation — CONTRATTI (osservabilità, non enforcement)
 * Segnali dichiarativi per violation SLA. Completamente serializzabili.
 */

/**
 * Tipo di violation SLA.
 */
export type ReadSLAViolationKind = 'stale-read' | 'latency-exceeded' | 'unknown';

/**
 * Segnale di violation SLA.
 */
export interface ReadSLAViolationSignal {
  readonly kind: ReadSLAViolationKind;
  readonly readModel: string;
  readonly readId?: string;
  readonly observedValue?: number;
  readonly expectedValue?: number;
  readonly timestamp: number;
}
