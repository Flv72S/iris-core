/**
 * IrisInterpreter — IRIS 9.0
 * Contratto: interpret(snapshot) → interpretazioni o null.
 * NON muta snapshot; NON dipende da altri interpreter; NON conosce orchestrazione o UX.
 */

import type { SemanticSnapshot } from '../../semantic-layer';
import type { IrisInterpretation } from './IrisInterpretation';

export interface IrisInterpreter {
  readonly id: string;
  /**
   * Interpreta lo snapshot. Restituisce null = nessuna interpretazione.
   * NON muta snapshot; side-effect free.
   */
  interpret(snapshot: SemanticSnapshot): readonly IrisInterpretation[] | null;
}
