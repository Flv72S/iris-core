/**
 * Behavioral Snapshot Level 1 — tipi derivati (6.2.2)
 *
 * Solo indicatori numerici normalizzati. Nessuna etichetta semantica.
 * Livello 1 = derivazione tecnica, non interpretazione.
 */

/** Snapshot L1 per thread/chat. Solo numeri derivati. */
export interface ThreadSnapshotL1 {
  readonly normalizedFrequency: number;
  readonly temporalDensity: number;
  readonly frequencyDelta: number;
  readonly technicalInactivityMs: number;
}

/** Snapshot L1 per utente. Solo numeri derivati. */
export interface UserSnapshotL1 {
  readonly normalizedFrequency: number;
  readonly activityDelta: number;
  readonly timeSinceLastActivityMs: number;
  readonly bucketDistributionPercent: readonly number[];
}
