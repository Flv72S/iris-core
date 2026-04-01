/**
 * FocusWellbeingPipeline — C.7 (Demo-Oriented)
 * Una sola feature: FOCUS_GUARD se FOCUSED, WELLBEING_GATE se BLOCKED, altrimenti null.
 */

import type { FeaturePipeline } from '../FeaturePipeline';
import type { FeaturePipelineInput } from '../FeaturePipelineInput';
import type { FeatureOutput } from '../FeatureOutput';

const FOCUS_GUARD_ID = 'focus-guard';
const WELLBEING_GATE_ID = 'wellbeing-gate';

export function createFocusWellbeingPipeline(): FeaturePipeline {
  return {
    id: 'focus-wellbeing',
    featureType: 'FOCUS_GUARD',
    run(input: FeaturePipelineInput): FeatureOutput | null {
      const { experience, now } = input;
      if (experience.label === 'FOCUSED') {
        return Object.freeze({
          featureId: FOCUS_GUARD_ID,
          featureType: 'FOCUS_GUARD',
          title: 'Focus Guard',
          visibility: 'visible',
          priority: 'normal',
          explanation:
            'Your current state is recognized and reflected without enforcing actions.',
          derivedAt: now,
        });
      }
      if (experience.label === 'BLOCKED') {
        return Object.freeze({
          featureId: WELLBEING_GATE_ID,
          featureType: 'WELLBEING_GATE',
          title: 'Wellbeing Gate',
          visibility: 'visible',
          priority: 'normal',
          explanation:
            'Your current state is recognized and reflected without enforcing actions.',
          derivedAt: now,
        });
      }
      return null;
    },
  };
}
