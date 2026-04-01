/**
 * DefaultFeatureOrchestrator — C.8 + C.9 light
 * Mappa FeatureOutput → OrchestratedFeature applicando Product Mode. Nessun filtro, nessun riordino.
 */

import type { FeatureOutput } from '../feature-pipelines/FeatureOutput';
import type { UxExperienceState } from '../ux-experience/UxExperienceState';
import type { ProductMode } from './ProductMode';
import type { FeatureOrchestrationInput } from './FeatureOrchestrationInput';
import type { OrchestratedFeature } from './OrchestratedFeature';
import type { FeatureOrchestrator } from './FeatureOrchestrator';
import type { FeatureOrchestratorRegistry } from './FeatureOrchestratorKillSwitch';
import { isFeatureOrchestratorEnabled } from './FeatureOrchestratorKillSwitch';

function visibilityForFeature(
  feature: FeatureOutput,
  mode: ProductMode,
  experience: UxExperienceState
): OrchestratedFeature['visibility'] {
  if (mode === 'DEFAULT') return feature.visibility;
  if (mode === 'FOCUS') {
    if (feature.featureType === 'SMART_INBOX') {
      return feature.visibility === 'visible' ? 'reduced' : feature.visibility;
    }
    if (feature.featureType === 'FOCUS_GUARD') return 'visible';
    if (feature.featureType === 'WELLBEING_GATE') {
      const dominant =
        experience.label === 'BLOCKED' || experience.suggestedLens === 'wellbeing';
      return dominant ? 'visible' : 'hidden';
    }
  }
  if (mode === 'WELLBEING') {
    if (feature.featureType === 'WELLBEING_GATE') return 'visible';
    if (feature.featureType === 'SMART_INBOX') {
      return feature.visibility === 'visible' ? 'reduced' : feature.visibility;
    }
    return 'hidden';
  }
  return feature.visibility;
}

export function applyProductMode(
  feature: FeatureOutput,
  mode: ProductMode,
  experience: UxExperienceState
): OrchestratedFeature {
  const visibility = visibilityForFeature(feature, mode, experience);
  return Object.freeze({
    featureId: feature.featureId,
    featureType: feature.featureType,
    title: feature.title,
    description: feature.description,
    visibility,
    priority: feature.priority,
    explanation: feature.explanation,
    appliedMode: mode,
    derivedAt: feature.derivedAt,
  });
}

export class DefaultFeatureOrchestrator implements FeatureOrchestrator {
  constructor(private readonly registry: FeatureOrchestratorRegistry) {}

  orchestrate(input: FeatureOrchestrationInput): readonly OrchestratedFeature[] {
    if (!isFeatureOrchestratorEnabled(this.registry)) {
      return Object.freeze([]);
    }
    const { features, experience, mode, now } = input;
    const result = features.map((f) =>
      applyProductMode(f, mode, experience)
    );
    return Object.freeze(result.map((o) => Object.freeze(o)));
  }
}
