/**
 * VoiceReadinessPipeline — C.7
 * Killer feature: voice ready. suggestedLens = voice → ready true; confidenceBand low → ready false.
 */

import type { FeaturePipeline } from '../../../FeaturePipeline';
import type { FeaturePipelineInput } from '../../../FeaturePipelineInput';
import type { VoiceReadinessOutput } from './VoiceReadinessOutput';

export const VOICE_READINESS_PIPELINE_ID = 'voice-readiness';

export function createVoiceReadinessPipeline(): FeaturePipeline<
  FeaturePipelineInput,
  VoiceReadinessOutput
> {
  return {
    id: VOICE_READINESS_PIPELINE_ID,
    run(input: FeaturePipelineInput): VoiceReadinessOutput {
      const { experience, now } = input;
      const ready =
        experience.suggestedLens === 'voice' &&
        experience.confidenceBand !== 'low';
      const reason = ready
        ? 'Voice interaction is ready.'
        : experience.suggestedLens === 'voice' && experience.confidenceBand === 'low'
          ? 'Voice lens active but confidence is low.'
          : 'Voice is not the suggested lens.';
      return Object.freeze({
        ready,
        reason,
        derivedAt: now,
      });
    },
  };
}
