/**
 * DefaultFeatureOrchestrator — C.8
 * Filtra null, ordine statico, primary ≤ 1, secondary ≤ 2. Non modifica output delle pipeline.
 */

import type { FeatureOrchestrator } from './FeatureOrchestrator';
import type { FeatureOrchestratorInput } from './FeatureOrchestratorInput';
import type { OrchestratedFeature } from './OrchestratedFeature';
import type { FeatureOrchestratorRegistry } from './FeatureOrchestratorKillSwitch';
import { isFeatureOrchestratorEnabled } from './FeatureOrchestratorKillSwitch';

const STATIC_ORDER: Record<string, number> = {
  'smart-summary': 0,
  'daily-focus': 1,
  wellbeing: 2,
  'voice-readiness': 3,
};

const DEFAULT_ORDER = 100;

function orderForFeatureId(featureId: string): number {
  return STATIC_ORDER[featureId] ?? DEFAULT_ORDER;
}

function orchestrateCore(input: FeatureOrchestratorInput): OrchestratedFeature<unknown>[] {
  const filtered = input.featureOutputs.filter((e) => e.output != null);
  const sorted = [...filtered].sort(
    (a, b) => orderForFeatureId(a.featureId) - orderForFeatureId(b.featureId)
  );
  const isNeutral = input.experience.label === 'NEUTRAL';
  const result: OrchestratedFeature<unknown>[] = [];
  let primaryCount = 0;
  let secondaryCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    let visibility: 'primary' | 'secondary' | 'hidden' = 'hidden';
    if (isNeutral) {
      if (primaryCount < 1) {
        visibility = 'primary';
        primaryCount++;
      }
    } else {
      if (primaryCount < 1) {
        visibility = 'primary';
        primaryCount++;
      } else if (secondaryCount < 2) {
        visibility = 'secondary';
        secondaryCount++;
      }
    }
    result.push(
      Object.freeze({
        featureId: entry.featureId,
        output: entry.output,
        order: i,
        visibility,
      })
    );
  }
  return result;
}

export class DefaultFeatureOrchestrator implements FeatureOrchestrator {
  constructor(private readonly registry: FeatureOrchestratorRegistry) {}

  orchestrate(input: FeatureOrchestratorInput): readonly OrchestratedFeature<unknown>[] {
    if (!isFeatureOrchestratorEnabled(this.registry)) {
      return Object.freeze([]);
    }
    const list = orchestrateCore(input);
    return Object.freeze(list.map((o) => Object.freeze(o)));
  }
}

export function orchestrateFeatures(input: FeatureOrchestratorInput): readonly OrchestratedFeature<unknown>[] {
  const list = orchestrateCore(input);
  return Object.freeze(list.map((o) => Object.freeze(o)));
}
