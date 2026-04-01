/**
 * IrisInterpretationEngine — IRIS 9.0
 * Valuta tutti gli interpreter in ordine dichiarato; accumula interpretazioni.
 * Nessun filtro, deduplicazione, merge intelligente, ranking. Side-effect free.
 */

import type { SemanticSnapshot } from '../../semantic-layer';
import type { IrisInterpreter } from './IrisInterpreter';
import type { IrisInterpretation } from './IrisInterpretation';
import type { IrisInterpretationModel } from './IrisInterpretationModel';

/**
 * Engine: interpret(snapshot) → modello con elenco completo delle interpretazioni.
 * Ogni interpreter può restituire null o una o più IrisInterpretation; tutte accumulate.
 */
export class IrisInterpretationEngine {
  constructor(private readonly interpreters: readonly IrisInterpreter[]) {}

  /**
   * Interpreta lo snapshot con tutti gli interpreter. Accumula; nessuna selezione.
   */
  interpret(snapshot: SemanticSnapshot): IrisInterpretationModel {
    const list: IrisInterpretation[] = [];
    for (const interpreter of this.interpreters) {
      const out = interpreter.interpret(snapshot);
      if (out != null && out.length > 0) {
        list.push(...out);
      }
    }
    const interpretations = Object.freeze([...list]);
    const model: IrisInterpretationModel = Object.freeze({
      interpretations,
      derivedAt: new Date().toISOString(),
    });
    return model;
  }
}
