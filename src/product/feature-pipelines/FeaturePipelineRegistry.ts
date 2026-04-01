/**
 * FeaturePipelineRegistry — C.7
 * Registry di pipeline. Nessuna coordinazione, nessuna esecuzione.
 */

import type { FeaturePipeline } from './FeaturePipeline';

export interface FeaturePipelineRegistry {
  register(pipeline: FeaturePipeline<unknown, unknown>): void;
  getAll(): readonly FeaturePipeline<unknown, unknown>[];
}
