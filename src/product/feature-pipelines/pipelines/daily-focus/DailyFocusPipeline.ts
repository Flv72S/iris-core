/**
 * DailyFocusPipeline — C.7
 * Killer feature: focus level da experience. FOCUSED → high, OVERLOADED → low. confidenceBand influenza focusReason.
 */

import type { FeaturePipeline } from '../../FeaturePipeline';
import type { FeaturePipelineInput } from '../../FeaturePipelineInput';
import type { DailyFocusOutput, FocusLevel } from './DailyFocusOutput';

export const DAILY_FOCUS_PIPELINE_ID = 'daily-focus';

function focusLevelFromExperience(label: string): FocusLevel {
  if (label === 'FOCUSED') return 'high';
  if (label === 'OVERLOADED') return 'low';
  if (label === 'WAITING' || label === 'REFLECTIVE') return 'medium';
  return 'low';
}

export function createDailyFocusPipeline(): FeaturePipeline {
  return {
    id: DAILY_FOCUS_PIPELINE_ID,
    featureType: 'SMART_INBOX',
    run(input: FeaturePipelineInput): DailyFocusOutput {
      const { experience, now } = input;
      const focusLevel = focusLevelFromExperience(experience.label);
      const focusReason =
        experience.confidenceBand === 'high'
          ? experience.explanation
          : experience.confidenceBand === 'medium'
            ? `${experience.explanation} (moderate confidence)`
            : 'Experience state unclear.';
      const suggestedLens =
        experience.suggestedLens === 'focus' ? 'focus' : 'neutral';
      return Object.freeze({
        focusLevel,
        focusReason,
        suggestedLens,
        derivedAt: now,
      });
    },
  };
}
