/**
 * Signal Coverage — Verifica che ogni killer feature sia supportata da semantic signal types.
 * Nessuna generazione di segnali.
 */

import type { KillerFeatureId } from '../types';
import type { SemanticSignalType } from '../../../../iris/semantic-interpretation/SemanticSignal';

export interface KillerFeatureSignalCoverage {
  readonly feature: KillerFeatureId;
  readonly requiredSemanticSignals: readonly SemanticSignalType[];
  readonly provided: boolean;
  readonly missingSignals: readonly SemanticSignalType[];
}

/** Tutti i tipi esposti dal layer semantic-interpretation (fonte: SemanticSignalType) */
const ALL_SEMANTIC_SIGNAL_TYPES: readonly SemanticSignalType[] = Object.freeze([
  'FOCUS_CONTEXT',
  'WAITING_CONTEXT',
  'INTERRUPTION_CONTEXT',
  'OVERLOAD_CONTEXT',
  'WELLBEING_RISK',
  'IDLE_CONTEXT',
]);

/** Per ogni killer feature, segnali semantici necessari (dichiarativo) */
const REQUIRED_SIGNALS: Readonly<Record<KillerFeatureId, readonly SemanticSignalType[]>> =
  Object.freeze({
    'focus-intelligence': Object.freeze(['FOCUS_CONTEXT']),
    'wellbeing-protection': Object.freeze(['WELLBEING_RISK']),
    'cognitive-load-awareness': Object.freeze(['OVERLOAD_CONTEXT', 'INTERRUPTION_CONTEXT']),
    'contextual-readiness': Object.freeze(['IDLE_CONTEXT', 'FOCUS_CONTEXT', 'WAITING_CONTEXT']),
  }) as Readonly<Record<KillerFeatureId, readonly SemanticSignalType[]>>;

const ALL_SET = new Set(ALL_SEMANTIC_SIGNAL_TYPES);

export function verifySignalCoverage(): readonly KillerFeatureSignalCoverage[] {
  const result: KillerFeatureSignalCoverage[] = [];
  for (const feature of Object.keys(REQUIRED_SIGNALS) as KillerFeatureId[]) {
    const required = REQUIRED_SIGNALS[feature];
    const missing = required.filter((t) => !ALL_SET.has(t));
    const provided = missing.length === 0;
    result.push(
      Object.freeze({
        feature,
        requiredSemanticSignals: required,
        provided,
        missingSignals: Object.freeze(missing),
      })
    );
  }
  return Object.freeze(result);
}
