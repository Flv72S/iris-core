/**
 * SmartInboxPipeline — C.7 (Demo-Oriented)
 * Feature: Smart Inbox. Regole da Demo Narrative.
 */

import type { FeaturePipeline } from '../FeaturePipeline';
import type { FeaturePipelineInput } from '../FeaturePipelineInput';
import type { FeatureOutput } from '../FeatureOutput';

const SMART_INBOX_ID = 'smart-inbox';

export function createSmartInboxPipeline(): FeaturePipeline {
  return {
    id: SMART_INBOX_ID,
    featureType: 'SMART_INBOX',
    run(input: FeaturePipelineInput): FeatureOutput | null {
      const { experience, now } = input;
      let visibility: FeatureOutput['visibility'] = 'visible';
      if (experience.label === 'FOCUSED' || experience.label === 'BLOCKED') {
        visibility = 'reduced';
      } else if (experience.label === 'WAITING') {
        visibility = 'visible';
      }
      const priority: FeatureOutput['priority'] =
        experience.label === 'WAITING' ? 'high' : 'normal';
      return Object.freeze({
        featureId: SMART_INBOX_ID,
        featureType: 'SMART_INBOX',
        title: 'Smart Inbox',
        visibility,
        priority,
        explanation:
          'Messages are grouped and presented according to your current context.',
        derivedAt: now,
      });
    },
  };
}
