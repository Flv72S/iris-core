/**
 * IrisOrchestrator — IRIS 9.1
 * Contratto: orchestrate(snapshot, interpretations) → risultato o null.
 * NON muta input; NON filtra o sceglie; può solo raggruppare, etichettare, instradare.
 */

import type { SemanticSnapshot } from '../../semantic-layer';
import type { IrisInterpretationModel } from '../interpretation';
import type { IrisOrchestrationResult } from './IrisOrchestrationResult';

export interface IrisOrchestrator {
  readonly id: string;
  /**
   * Orchestrazione dichiarativa. Restituisce null se non applicabile.
   * NON muta snapshot o interpretation model; NON filtra o sceglie interpretazioni.
   */
  orchestrate(
    snapshot: SemanticSnapshot,
    interpretations: IrisInterpretationModel
  ): IrisOrchestrationResult | null;
}
