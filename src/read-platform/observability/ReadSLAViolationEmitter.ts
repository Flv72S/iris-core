/**
 * Read SLA Violation Emitter — OSSERVABILITÀ (passivo, non enforcement)
 * Emette segnali di violation per osservabilità, metriche, audit.
 */

import type { ReadFreshnessResult } from '../freshness/ReadFreshness';
import type { ReadSLA } from '../../core/read-sla/ReadSLA';
import type { ReadSLAViolationSignal } from './ReadSLAViolation';

/**
 * Porta per emissione segnali di violation SLA.
 */
export interface ReadSLAViolationEmitter {
  emit(signal: ReadSLAViolationSignal): void;
}

/**
 * Emitter in-memory per osservabilità, testing, sviluppo.
 */
export class InMemoryReadSLAViolationEmitter implements ReadSLAViolationEmitter {
  private readonly signals: ReadSLAViolationSignal[] = [];

  emit(signal: ReadSLAViolationSignal): void {
    this.signals.push(signal);
  }

  getEmitted(): ReadSLAViolationSignal[] {
    return [...this.signals];
  }
}

/**
 * Parametri per evaluateAndEmit.
 */
export interface EvaluateAndEmitParams {
  readonly freshness: ReadFreshnessResult;
  readonly readModel: string;
  readonly readId?: string;
  readonly sla?: ReadSLA;
}

/**
 * Valuta freshness e, se necessario, emette un segnale di violation.
 * Funzione pura rispetto alla logica; side-effect solo via emit.
 */
export function evaluateAndEmit(
  params: EvaluateAndEmitParams,
  emitter: ReadSLAViolationEmitter
): void {
  const { freshness, readModel, readId } = params;
  const timestamp = Date.now();

  if (freshness.status === 'stale') {
    emitter.emit({
      kind: 'stale-read',
      readModel,
      readId,
      observedValue: freshness.ageMs,
      expectedValue: freshness.maxStalenessMs,
      timestamp,
    });
    return;
  }

  if (freshness.status === 'unknown') {
    emitter.emit({
      kind: 'unknown',
      readModel,
      readId,
      timestamp,
    });
  }

  // freshness.status === 'fresh' → non emettere nulla
}
