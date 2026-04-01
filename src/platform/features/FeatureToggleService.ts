/**
 * Feature Toggle Service - orchestratore centrale
 * Microstep 5.3.4
 *
 * Single source of truth. Feature non registrata → disabled (fail-safe).
 */

import type { FeatureEvaluationContext } from './FeatureEvaluationContext';
import type { FeatureDecision } from './FeatureDecision';
import { featureDisabled } from './FeatureDecision';
import type { FeatureToggle } from './FeatureToggle';

export class FeatureToggleService {
  private readonly features = new Map<string, FeatureToggle>();

  register(feature: FeatureToggle): void {
    const key = feature.definition.key;
    this.features.set(key, feature);
  }

  /**
   * Valuta se una feature è abilitata per il contesto dato.
   * Deterministico. Feature non registrata → disabled (fail-safe).
   */
  isEnabled(featureKey: string, context: FeatureEvaluationContext): FeatureDecision {
    const feature = this.features.get(featureKey);
    if (!feature) {
      return featureDisabled(`Feature "${featureKey}" is not registered`);
    }
    return feature.evaluate(context);
  }

  /**
   * Ritorna le chiavi delle feature abilitate per il contesto (per integrazione con PluginActivationContext.features).
   */
  getEnabledFeatureKeys(context: FeatureEvaluationContext): readonly string[] {
    const enabled: string[] = [];
    for (const key of this.features.keys()) {
      const decision = this.isEnabled(key, context);
      if (decision.enabled) {
        enabled.push(key);
      }
    }
    return Object.freeze(enabled);
  }
}
