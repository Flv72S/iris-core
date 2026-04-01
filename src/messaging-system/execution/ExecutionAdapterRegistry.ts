/**
 * ExecutionAdapterRegistry — C.4
 * Registry di adapter eseguibili. Solo AdapterDescriptor/AdapterContract dichiarati.
 */

import type { ActionPlanStep } from '../action-plan/ActionPlanStep';
import type { AdapterContract } from '../execution-boundary/AdapterContract';

/**
 * Registry che espone adapter per capability.
 * Trova un adapter compatibile con lo step (per capabilityType).
 */
export interface ExecutionAdapterRegistry {
  /**
   * Restituisce un adapter che supporta il tipo di capability dello step, o null.
   * Nessuna priorità, nessun fallback: primo match o null.
   */
  findAdapterForStep(step: ActionPlanStep): AdapterContract | null;

  /** Tutti gli adapter registrati (sola lettura). */
  getAdapters(): readonly AdapterContract[];
}
