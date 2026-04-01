/**
 * SmartSummaryPipeline — C.7
 * Killer feature: summary da experience + dominantSignals. NEUTRAL → null. Max 5 highlights.
 */

import type { FeaturePipeline } from '../../../FeaturePipeline';
import type { FeaturePipelineInput } from '../../../FeaturePipelineInput';
import type { SmartSummaryOutput } from './SmartSummaryOutput';

const MAX_HIGHLIGHTS = 5;

export const SMART_SUMMARY_PIPELINE_ID = 'smart-summary';

export function createSmartSummaryPipeline(): FeaturePipeline<
  FeaturePipelineInput,
  SmartSummaryOutput
> {
  return {
    id: SMART_SUMMARY_PIPELINE_ID,
    run(input: FeaturePipelineInput): SmartSummaryOutput | null {
      if (input.experience.label === 'NEUTRAL') return null;
      const { experience, now } = input;
      const allSignals = [
        ...experience.dominantSignals,
        ...experience.secondarySignals,
      ];
      const highlights = allSignals
        .slice(0, MAX_HIGHLIGHTS)
        .map((s) => (s.length > 0 ? s : experience.explanation));
      const title =
        experience.label === 'FOCUSED'
          ? 'Focus summary'
          : experience.label === 'REFLECTIVE'
            ? 'Reflection summary'
            : experience.label === 'WAITING'
              ? 'Waiting summary'
              : 'Summary';
      return Object.freeze({
        title,
        highlights: Object.freeze(highlights.length > 0 ? highlights : [experience.explanation]),
        confidenceBand: experience.confidenceBand,
        derivedAt: now,
      });
    },
  };
}
