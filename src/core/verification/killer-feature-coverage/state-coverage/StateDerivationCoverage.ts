/**
 * State Coverage — Verifica che ogni killer feature produca stato derivato / experience / eligibility.
 * Usa deriveState con segnali minimi per ogni feature.
 */

import type { SemanticSignal } from '../../../../iris/semantic-interpretation/SemanticSignal';
import { deriveState } from '../../../state-derivation/StateDerivationEngine';
import type { KillerFeatureId } from '../types';
import { KILLER_FEATURE_IDS } from '../types';

export interface KillerFeatureStateCoverage {
  readonly feature: KillerFeatureId;
  readonly coveredByUxState: boolean;
  readonly coveredByExperience: boolean;
  readonly coveredByEligibility: boolean;
}

const NOW = 1704110400000;

function sig(id: string, type: SemanticSignal['type']): SemanticSignal {
  return Object.freeze({
    id,
    type,
    detectedAt: NOW,
    sourceWindowIds: Object.freeze([]),
    evidence: Object.freeze([]),
  });
}

/** Segnali minimi per triggerare ogni killer feature (per verifica coverage) */
function signalsForFeature(feature: KillerFeatureId): readonly SemanticSignal[] {
  switch (feature) {
    case 'focus-intelligence':
      return Object.freeze([sig('f1', 'FOCUS_CONTEXT')]);
    case 'wellbeing-protection':
      return Object.freeze([sig('w1', 'WELLBEING_RISK')]);
    case 'cognitive-load-awareness':
      return Object.freeze([
        sig('o1', 'OVERLOAD_CONTEXT'),
        sig('o2', 'OVERLOAD_CONTEXT'),
        sig('o3', 'INTERRUPTION_CONTEXT'),
      ]);
    case 'contextual-readiness':
      return Object.freeze([sig('c1', 'IDLE_CONTEXT')]);
    default:
      return Object.freeze([]);
  }
}

/** Attese per feature: quali stati/experience/eligibility ci aspettiamo */
function expectCoverage(feature: KillerFeatureId): {
  uxState: boolean;
  experience: boolean;
  eligibility: boolean;
} {
  switch (feature) {
    case 'focus-intelligence':
      return { uxState: true, experience: true, eligibility: true };
    case 'wellbeing-protection':
      return { uxState: true, experience: true, eligibility: true };
    case 'cognitive-load-awareness':
      return { uxState: true, experience: true, eligibility: true };
    case 'contextual-readiness':
      return { uxState: false, experience: true, eligibility: false };
    default:
      return { uxState: false, experience: false, eligibility: false };
  }
}

export function verifyStateCoverage(): readonly KillerFeatureStateCoverage[] {
  const result: KillerFeatureStateCoverage[] = [];
  for (const feature of KILLER_FEATURE_IDS) {
    const signals = signalsForFeature(feature);
    const snapshot = deriveState(signals, NOW);
    const expect = expectCoverage(feature);

    const coveredByUxState =
      expect.uxState === false ||
      (expect.uxState === true && snapshot.uxStates.length > 0);
    const coveredByExperience =
      snapshot.experienceCandidates.length > 0;
    const hasEligibility = snapshot.featureEligibility.some((e) => e.eligible);
    const coveredByEligibility =
      expect.eligibility === false || (expect.eligibility === true && hasEligibility);

    result.push(
      Object.freeze({
        feature,
        coveredByUxState,
        coveredByExperience,
        coveredByEligibility,
      })
    );
  }
  return Object.freeze(result);
}
