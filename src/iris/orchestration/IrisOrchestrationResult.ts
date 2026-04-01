/**
 * IrisOrchestrationResult — IRIS 9.1
 * Risultato dichiarativo; nessuna nozione di "finale".
 */

import type { IrisInterpretation } from '../interpretation';

export interface IrisOrchestrationResult {
  readonly planId: string;
  readonly interpretations: readonly IrisInterpretation[];
  readonly producedBy: readonly string[];
  readonly derivedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
