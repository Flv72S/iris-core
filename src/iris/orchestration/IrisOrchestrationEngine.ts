/**
 * IrisOrchestrationEngine — IRIS 9.1
 * Valuta tutti gli orchestrator attivi; accumula risultati non-null.
 * Nessuna deduplica, nessun merge intelligente. Side-effect free.
 */

import type { SemanticSnapshot } from '../../semantic-layer';
import type { IrisInterpretationModel } from '../interpretation';
import type { IrisOrchestrator } from './IrisOrchestrator';
import type { IrisOrchestrationResult } from './IrisOrchestrationResult';
import type { OrchestrationRegistry } from './IrisOrchestrationKillSwitch';
import { isOrchestrationEnabled } from './IrisOrchestrationKillSwitch';

export class IrisOrchestrationEngine {
  constructor(private readonly orchestrators: readonly IrisOrchestrator[]) {}

  /**
   * Orchestrazione: snapshot + interpretation model → elenco risultati.
   * Se kill-switch OFF restituisce [].
   */
  orchestrate(
    snapshot: SemanticSnapshot,
    interpretationModel: IrisInterpretationModel,
    registry: OrchestrationRegistry
  ): readonly IrisOrchestrationResult[] {
    if (!isOrchestrationEnabled(registry)) {
      return Object.freeze([]);
    }
    const results: IrisOrchestrationResult[] = [];
    for (const orchestrator of this.orchestrators) {
      const result = orchestrator.orchestrate(snapshot, interpretationModel);
      if (result != null) {
        results.push(
          Object.freeze({
            ...result,
            interpretations: Object.freeze([...result.interpretations]),
            producedBy: Object.freeze([...result.producedBy]),
          })
        );
      }
    }
    return Object.freeze(results);
  }
}
