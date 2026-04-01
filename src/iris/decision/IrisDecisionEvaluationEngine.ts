/**
 * IrisDecisionEvaluationEngine — IRIS 11.2
 * Aggregatore di evaluation notes: invoca tutti i provider, accumula tutte le note.
 * Nessuna deduplicazione, nessun ranking, nessuna selezione.
 */

import type { IrisDecisionArtifactSet } from './IrisDecisionArtifactSet';
import type { IrisDecisionEvaluationProvider } from './IrisDecisionEvaluationProvider';
import type { IrisDecisionEvaluationNote } from './IrisDecisionEvaluation';
import type { IrisDecisionEvaluationSnapshot } from './IrisDecisionEvaluationSnapshot';
import type { DecisionRegistry } from './IrisDecisionKillSwitch';
import { isDecisionEnabled } from './IrisDecisionKillSwitch';

export class IrisDecisionEvaluationEngine {
  constructor(private readonly providers: readonly IrisDecisionEvaluationProvider[]) {}

  /**
   * Invoca tutti i provider, accumula tutte le note. Kill-switch OFF → notes [].
   */
  evaluate(
    artifactSet: IrisDecisionArtifactSet,
    registry: DecisionRegistry
  ): IrisDecisionEvaluationSnapshot {
    const derivedAt = new Date().toISOString();
    if (!isDecisionEnabled(registry)) {
      return Object.freeze({
        notes: Object.freeze([]),
        derivedAt,
      });
    }
    const notes: IrisDecisionEvaluationNote[] = [];
    for (const provider of this.providers) {
      const out = provider.evaluate(artifactSet);
      if (out != null && out.length > 0) {
        for (const n of out) {
          notes.push(
            Object.freeze({
              id: n.id,
              artifactId: n.artifactId,
              evaluationType: n.evaluationType,
              observation: n.observation,
              ...(n.metadata != null && { metadata: Object.freeze({ ...n.metadata }) }),
              derivedAt: n.derivedAt,
            })
          );
        }
      }
    }
    return Object.freeze({
      notes: Object.freeze(notes),
      derivedAt,
    });
  }
}
