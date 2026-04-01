/**
 * IrisDeliveryResult — IRIS 10.1
 * Aggregato di outcome di delivery. Accumulo; nessuna selezione.
 */

import type { IrisDeliveryOutcome } from './IrisDeliveryOutcome';

export interface IrisDeliveryResult {
  readonly results: readonly IrisDeliveryOutcome[];
  readonly derivedAt: string;
}
