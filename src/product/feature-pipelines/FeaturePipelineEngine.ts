/**
 * FeaturePipelineEngine — C.7 (Demo-Oriented)
 * Invoca tutte le pipeline, raccoglie output non-null. Non filtra, non ordina.
 * Sequence: Policies (if policyContext) → User Preferences product (if productPreferenceOptions) → core preferenceContext (if set) → only if ALLOWED add output.
 * If feature is already BLOCKED by policy, preferences are not consulted.
 */

import type { FeaturePipelineInput } from './FeaturePipelineInput';
import type { FeatureOutput } from './FeatureOutput';
import type { FeaturePipeline } from './FeaturePipeline';
import type { FeaturePipelineRegistry } from './FeaturePipelineKillSwitch';
import { isFeaturePipelineEnabled } from './FeaturePipelineKillSwitch';
import type { FeaturePipelinePolicyContext } from './FeaturePipelinePolicyContext';
import type { FeaturePipelinePreferenceContext } from './FeaturePipelinePreferenceContext';
import type { FeaturePipelinePreferenceOptions } from './FeaturePipelinePreferenceOptions';
import { evaluatePreference } from '../user-preferences/UserPreferenceEvaluator';
import { isUserPreferenceEnabled, USER_PREFERENCE_COMPONENT_ID } from '../user-preferences/UserPreferenceKillSwitch';
import { appendUserPreferenceAudit } from '../user-preferences/audit/UserPreferenceAudit';

export class FeaturePipelineEngine {
  constructor(private readonly pipelines: readonly FeaturePipeline[]) {}

  run(
    input: FeaturePipelineInput,
    registry: FeaturePipelineRegistry,
    policyContext?: FeaturePipelinePolicyContext,
    preferenceContext?: FeaturePipelinePreferenceContext,
    productPreferenceOptions?: FeaturePipelinePreferenceOptions
  ): readonly FeatureOutput[] {
    if (!isFeaturePipelineEnabled(registry)) {
      return Object.freeze([]);
    }
    const results: FeatureOutput[] = [];

    for (const pipeline of this.pipelines) {
      const out = pipeline.run(input);
      if (out == null) continue;

      if (policyContext != null && 'featureId' in out) {
        const policyInput = Object.freeze({
          featureId: out.featureId,
          derivedState: policyContext.derivedState,
          uxExperience: input.experience,
          productMode: policyContext.productMode,
          now: input.now,
          featurePriority: 'priority' in out ? (out.priority as 'low' | 'normal' | 'high') : undefined,
        });
        const decision = policyContext.engine.evaluate(policyInput);
        if (decision.status === 'BLOCKED') continue;
      }

      if (productPreferenceOptions?.userPreferences != null && 'featureId' in out) {
        if (isUserPreferenceEnabled(productPreferenceOptions.preferenceKillSwitch, USER_PREFERENCE_COMPONENT_ID)) {
          const category = productPreferenceOptions.getFeatureCategory?.(out.featureId);
          const decision = evaluatePreference(
            out.featureId,
            category,
            productPreferenceOptions.userPreferences
          );
          const now = Date.now();
          appendUserPreferenceAudit(
            Object.freeze({
              featureId: out.featureId,
              decision: decision.status,
              reason: decision.status === 'BLOCKED' ? decision.reason : undefined,
              evaluatedAt: now,
            })
          );
          if (decision.status === 'BLOCKED') continue;
        }
      }

      if (preferenceContext != null && 'featureId' in out) {
        const prefContext = Object.freeze({
          featureId: out.featureId,
          productMode: preferenceContext.productMode,
          maySendNotification: 'maySendNotification' in out ? (out as { maySendNotification?: boolean }).maySendNotification : undefined,
        });
        const prefDecision = preferenceContext.engine.evaluate(
          preferenceContext.store,
          prefContext
        );
        if (prefDecision.status === 'BLOCKED') continue;
      }

      results.push(Object.freeze(out));
    }
    return Object.freeze(results);
  }
}
