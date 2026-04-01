/**
 * ProductModeInput — C.9
 * Input: mode + features orchestrate. Nessun ricalcolo, nessun accesso a IRIS/Messaging.
 */

import type { OrchestratedFeature } from '../feature-orchestrator/OrchestratedFeature';
import type { ProductModeId } from './ProductMode';

export interface ProductModeInput {
  readonly mode: ProductModeId;
  readonly features: readonly OrchestratedFeature<unknown>[];
  readonly now: number;
}
