/**
 * WellbeingPipeline — C.7
 * Killer feature: wellbeing status. BLOCKED → attention; stability volatile → attention.
 */

import type { FeaturePipeline } from '../../FeaturePipeline';
import type { FeaturePipelineInput } from '../../FeaturePipelineInput';
import type { WellbeingOutput } from './WellbeingOutput';

export const WELLBEING_PIPELINE_ID = 'wellbeing';

export function createWellbeingPipeline(): FeaturePipeline {
  return {
    id: WELLBEING_PIPELINE_ID,
    featureType: 'WELLBEING_GATE',
    run(input: FeaturePipelineInput): WellbeingOutput {
      const { experience, now } = input;
      const needsAttention =
        experience.label === 'BLOCKED' || experience.stability === 'volatile';
      const status = needsAttention ? 'attention' : 'ok';
      const explanation = needsAttention
        ? experience.explanation
        : 'No wellbeing concerns.';
      return Object.freeze({
        status,
        explanation,
        derivedAt: now,
      });
    },
  };
}
