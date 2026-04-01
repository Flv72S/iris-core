/**
 * IrisInterpretationModel — IRIS 9.0
 * Contenitore di interpretazioni multiple. Solo dati; nessun metodo.
 */

import type { IrisInterpretation } from './IrisInterpretation';

export interface IrisInterpretationModel {
  readonly interpretations: readonly IrisInterpretation[];
  /** ISO timestamp. */
  readonly derivedAt: string;
  readonly snapshotHash?: string;
}
