/**
 * Context passed to FeaturePipelineEngine when policy gate is used.
 * Before adding a pipeline output, the engine calls the policy; if BLOCKED, the output is not produced.
 */

import type { FeaturePolicyEngine } from '../../core/policies/FeaturePolicyEngine';
import type { DerivedStateSnapshot } from '../../core/state-derivation/DerivedStateSnapshot';
import type { ProductMode } from '../orchestration/ProductMode';

export interface FeaturePipelinePolicyContext {
  readonly engine: FeaturePolicyEngine;
  readonly derivedState: DerivedStateSnapshot;
  readonly productMode: ProductMode;
}
