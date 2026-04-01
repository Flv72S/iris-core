/**
 * AdapterContract — C.3
 * Contratto per adapter esterni. Adapter riceve solo step; non decide, non pianifica, non valuta.
 * Adapter NON conosce IRIS, Intent, Contract, Decision.
 */

import type { ActionPlanStep } from '../action-plan/ActionPlanStep';
import type { ExecutionStepResult } from './ExecutionStepResult';

export interface AdapterContract {
  readonly adapterId: string;
  /** Tipi di capability supportati (identificatori stringa). */
  readonly supportedCapabilities: readonly string[];
  /**
   * Esegue un singolo step. L'adapter non può modificare lo step.
   * Implementazione esterna; non fornita in questo layer.
   */
  executeStep(step: ActionPlanStep): Promise<ExecutionStepResult>;
}
