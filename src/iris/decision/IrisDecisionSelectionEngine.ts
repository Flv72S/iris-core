/**
 * IrisDecisionSelectionEngine — IRIS 11.3
 * Aggregatore di selezioni dichiarate: invoca tutti i provider, accumula tutte le selezioni.
 * Nessuna deduplicazione, nessuna validazione semantica, nessuna risoluzione conflitti.
 */

import type { IrisDecisionArtifactSet } from './IrisDecisionArtifactSet';
import type { IrisDecisionEvaluationSnapshot } from './IrisDecisionEvaluationSnapshot';
import type { IrisDecisionSelectionProvider } from './IrisDecisionSelectionProvider';
import type { IrisDecisionSelection } from './IrisDecisionSelection';
import type { IrisDecisionSelectionSnapshot } from './IrisDecisionSelectionSnapshot';
import type { DecisionRegistry } from './IrisDecisionKillSwitch';
import { isDecisionEnabled } from './IrisDecisionKillSwitch';

export class IrisDecisionSelectionEngine {
  constructor(private readonly providers: readonly IrisDecisionSelectionProvider[]) {}

  /**
   * Invoca tutti i provider, accumula tutte le selezioni. Kill-switch OFF → selections [].
   */
  select(
    artifactSet: IrisDecisionArtifactSet,
    evaluationSnapshot: IrisDecisionEvaluationSnapshot | undefined,
    registry: DecisionRegistry
  ): IrisDecisionSelectionSnapshot {
    const derivedAt = new Date().toISOString();
    if (!isDecisionEnabled(registry)) {
      return Object.freeze({
        selections: Object.freeze([]),
        derivedAt,
      });
    }
    const selections: IrisDecisionSelection[] = [];
    for (const provider of this.providers) {
      const out = provider.select(artifactSet, evaluationSnapshot);
      if (out != null && out.length > 0) {
        for (const s of out) {
          selections.push(
            Object.freeze({
              selectionId: s.selectionId,
              artifactId: s.artifactId,
              selectionType: s.selectionType,
              justification: s.justification,
              derivedAt: s.derivedAt,
              ...(s.metadata != null && { metadata: Object.freeze({ ...s.metadata }) }),
            })
          );
        }
      }
    }
    return Object.freeze({
      selections: Object.freeze(selections),
      derivedAt,
    });
  }
}
