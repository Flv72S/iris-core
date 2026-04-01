/**
 * DryRunSnapshot - C.4.D
 * Snapshot immutabile dei risultati di dry-run. Nessuna azione reale.
 */

import type { DryRunResult } from './DryRunResult';

export interface DryRunSnapshot {
  readonly results: readonly DryRunResult[];
  readonly derivedAt: number;
}
