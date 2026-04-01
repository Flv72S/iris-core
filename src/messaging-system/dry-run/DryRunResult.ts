/**
 * DryRunResult - C.4.D
 * Risultato di simulazione per un singolo piano. Dichiarativo.
 */

import type { DryRunStep } from './DryRunStep';

export interface DryRunResult {
  readonly planId: string;
  readonly simulatedSteps: readonly DryRunStep[];
  readonly blocked: boolean;
  readonly reasons?: readonly string[];
}
