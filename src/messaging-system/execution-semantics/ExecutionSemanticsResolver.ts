/**
 * ExecutionSemanticsResolver - C.4.B
 * Interpreta semanticamente l'Action Plan, risolve vincoli e prerequisiti. NON esegue.
 */

import type { ActionPlanSnapshot } from '../action-plan/ActionPlanSnapshot';
import type { MessagingCapabilityRegistry } from '../capabilities/MessagingCapabilityRegistry';
import type { MessagingCapabilityType } from '../capabilities/MessagingCapabilityType';
import type { ExecutionSemanticRequirement } from './ExecutionSemanticRequirement';
import type { ExecutionSemanticBlocker } from './ExecutionSemanticBlocker';
import type { ExecutionSemanticHint } from './ExecutionSemanticHint';
import type { ExecutionSemanticSnapshot } from './ExecutionSemanticSnapshot';
import type { ExecutionSemanticsRegistry } from './ExecutionSemanticsKillSwitch';
import { isExecutionSemanticsEnabled } from './ExecutionSemanticsKillSwitch';

/** Mappa IrisCapabilityType (action-plan step) -> MessagingCapabilityType (C.4.A). Solo dichiarativa. */
const IRIS_TO_MESSAGING_CAPABILITY: Readonly<Record<string, MessagingCapabilityType>> = Object.freeze({
  'summarize.text': 'AI_SUMMARY',
  'summarize.voice': 'VOICE_SEND',
  'transcribe.voice': 'VOICE_TRANSCRIPTION',
  'semantic.search': 'SEMANTIC_SEARCH',
  'memory.store': 'SECOND_BRAIN_INDEXING',
  'memory.retrieve': 'SECOND_BRAIN_INDEXING',
  'attention.filter': 'DIGITAL_WELLBEING_GATE',
  'attention.observe': 'INBOX_PRIORITIZATION',
  'intent.suggest': 'SOCIAL_COACH_SIGNAL',
  'social.observe': 'SOCIAL_COACH_SIGNAL',
  'delivery.defer': 'TEXT_SEND',
  'context.link': 'THREAD_SYNTHESIS',
});

const VOICE_CAPABILITY_TYPES = new Set<MessagingCapabilityType>(['VOICE_SEND', 'VOICE_TRANSCRIPTION']);
const WELLBEING_CAPABILITY_TYPES = new Set<MessagingCapabilityType>(['DIGITAL_WELLBEING_GATE']);

export class ExecutionSemanticsResolver {
  constructor(private readonly capabilityRegistry: MessagingCapabilityRegistry) {}

  resolve(
    actionPlanSnapshot: ActionPlanSnapshot,
    registry: ExecutionSemanticsRegistry
  ): ExecutionSemanticSnapshot {
    const derivedAt = actionPlanSnapshot.derivedAt;
    if (!isExecutionSemanticsEnabled(registry)) {
      return Object.freeze({
        requirements: Object.freeze([]),
        blockers: Object.freeze([]),
        hints: Object.freeze([]),
        derivedAt,
      });
    }
    const requirements: ExecutionSemanticRequirement[] = [];
    const blockers: ExecutionSemanticBlocker[] = [];
    const hints: ExecutionSemanticHint[] = [];
    const availableTypes = new Set(
      this.capabilityRegistry.getCapabilities().map((c) => c.capabilityType)
    );

    for (const plan of actionPlanSnapshot.plans) {
      const planId = plan.planId;
      const requiredCaps = new Set<MessagingCapabilityType>();
      let hasVoice = false;
      let hasWellbeing = false;
      for (const step of plan.steps) {
        const msgType = IRIS_TO_MESSAGING_CAPABILITY[step.capabilityType];
        if (msgType) {
          requiredCaps.add(msgType);
          if (VOICE_CAPABILITY_TYPES.has(msgType)) hasVoice = true;
          if (WELLBEING_CAPABILITY_TYPES.has(msgType)) hasWellbeing = true;
        }
      }
      const reqList = [...requiredCaps];
      if (reqList.length > 0) {
        requirements.push(
          Object.freeze({
            requirementId: `req-${planId}`,
            actionPlanId: planId,
            requiredCapabilities: Object.freeze(reqList),
            declaredAt: plan.derivedAt,
          })
        );
      }
      for (const cap of reqList) {
        if (!availableTypes.has(cap)) {
          blockers.push(
            Object.freeze({
              blockerId: `block-${planId}-${cap}`,
              actionPlanId: planId,
              reason: 'MISSING_CAPABILITY',
              description: `Required capability ${cap} not available`,
              declaredAt: derivedAt,
            })
          );
        }
      }
      if (hasWellbeing) {
        blockers.push(
          Object.freeze({
            blockerId: `block-${planId}-wellbeing`,
            actionPlanId: planId,
            reason: 'DIGITAL_WELLBEING',
            description: 'Digital Wellbeing policy may apply',
            declaredAt: derivedAt,
          })
        );
      }
      if (hasVoice) {
        hints.push(
          Object.freeze({
            hintId: `hint-${planId}-voice`,
            actionPlanId: planId,
            hintType: 'VOICE_PREFERRED',
            description: 'Voice execution preferred for this plan',
            declaredAt: derivedAt,
          })
        );
      }
    }
    return Object.freeze({
      requirements: Object.freeze(requirements),
      blockers: Object.freeze(blockers),
      hints: Object.freeze(hints),
      derivedAt,
    });
  }
}
