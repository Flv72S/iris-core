/**
 * IrisDecisionArtifactEngine — IRIS 11.1
 * Aggregatore dichiarativo: invoca tutti i producer, accumula tutti gli artifact.
 * Nessuna deduplicazione, nessun ordinamento semantico, nessuna selezione.
 */

import type { IrisDecisionProducer } from './IrisDecisionProducer';
import type { IrisDecisionProducerInput } from './IrisDecisionProducer';
import type { IrisDecisionArtifact } from './IrisDecisionArtifact';
import type { IrisDecisionArtifactSet } from './IrisDecisionArtifactSet';
import type { DecisionRegistry } from './IrisDecisionKillSwitch';
import { isDecisionEnabled } from './IrisDecisionKillSwitch';

export class IrisDecisionArtifactEngine {
  constructor(private readonly producers: readonly IrisDecisionProducer[]) {}

  /**
   * Invoca tutti i producer, accumula tutti gli artifact. Kill-switch OFF → artifacts [].
   */
  produce(
    input: IrisDecisionProducerInput,
    registry: DecisionRegistry
  ): IrisDecisionArtifactSet {
    const derivedAt = new Date().toISOString();
    if (!isDecisionEnabled(registry)) {
      return Object.freeze({
        artifacts: Object.freeze([]),
        derivedAt,
      });
    }
    const artifacts: IrisDecisionArtifact[] = [];
    for (const producer of this.producers) {
      const out = producer.produce(input);
      if (out != null && out.length > 0) {
        for (const a of out) {
          artifacts.push(
            Object.freeze({
              id: a.id,
              decisionType: a.decisionType,
              inputs: Object.freeze([...a.inputs]),
              statement: a.statement,
              ...(a.rationale != null && { rationale: a.rationale }),
              ...(a.metadata != null && { metadata: Object.freeze({ ...a.metadata }) }),
              derivedAt: a.derivedAt,
            })
          );
        }
      }
    }
    return Object.freeze({
      artifacts: Object.freeze(artifacts),
      derivedAt,
    });
  }
}
