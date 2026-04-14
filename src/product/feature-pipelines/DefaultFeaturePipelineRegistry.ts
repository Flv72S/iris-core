/**
 * DefaultFeaturePipelineRegistry — C.7
 * Implementazione registry: registra e restituisce pipeline. Nessuna coordinazione.
 */

import type { FeaturePipeline } from './FeaturePipeline';
import type { FeaturePipelineRegistry } from './FeaturePipelineRegistry';

export class DefaultFeaturePipelineRegistry implements FeaturePipelineRegistry {
  private readonly pipelines: FeaturePipeline[] = [];

  register(pipeline: FeaturePipeline): void {
    this.pipelines.push(pipeline);
  }

  getAll(): readonly FeaturePipeline[] {
    return this.pipelines;
  }
}
