/**
 * FeaturePipeline — C.7 (Demo-Oriented)
 * Una pipeline produce al più un FeatureOutput. Null = feature non rilevante.
 */

import type { FeaturePipelineInput } from './FeaturePipelineInput';
import type { FeatureOutput } from './FeatureOutput';
import type { FeatureType } from './FeatureType';

export interface FeaturePipeline {
  readonly id: string;
  readonly featureType: FeatureType;
  run(input: FeaturePipelineInput): FeatureOutput | null;
}
