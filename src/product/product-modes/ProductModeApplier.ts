/**
 * ProductModeApplier — C.9
 * Applica una lente UX: modula visibilità e ordering senza modificare payload.
 */

import type { ProductModeInput } from './ProductModeInput';
import type { OrchestratedFeature } from '../feature-orchestrator/OrchestratedFeature';

export interface ProductModeApplier {
  apply(input: ProductModeInput): readonly OrchestratedFeature<unknown>[];
}
