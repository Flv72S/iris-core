/**
 * DefaultFeaturePipelineRegistry — C.7
 * Implementazione registry: registra e restituisce pipeline. Nessuna coordinazione.
 */

import type { FeaturePipeline } from './FeaturePipeline';
import type { FeaturePipelineRegistry } from './FeaturePipelineRegistry';

export class DefaultFeaturePipelineRegistry implements FeaturePipelineRegistry {
  private readonly pipelines: FeaturePipeline<unknown, unknown>[] = [];

  register(pipeline: FeaturePipeline<unknown, unknown>): void {
    this.pipelines.push(pipeline);
  }

  getAll(): readonly FeaturePipeline<unknown, unknown>[] {
    return this.pipelines;
  }
}
