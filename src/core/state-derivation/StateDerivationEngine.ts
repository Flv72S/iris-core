/**
 * IRIS State Derivation Engine
 *
 * This module derives internal product state from interpreted semantic signals.
 * It does not execute actions, activate features, or make final decisions.
 * All outputs are read-only and deterministic.
 */

import type { SemanticSignal } from '../../iris/semantic-interpretation/SemanticSignal';
import type { DerivedUxState } from './derived-ux-state/DerivedUxState';
import type { DerivedExperienceCandidate } from './derived-experience/DerivedExperienceCandidate';
import type { FeatureEligibility } from './feature-eligibility/FeatureEligibility';
import type { DerivedStateSnapshot } from './DerivedStateSnapshot';

/** Regola: FOCUS_CONTEXT → derive FOCUS_ACTIVE */
function deriveUxStates(signals: readonly SemanticSignal[]): DerivedUxState[] {
  const out: DerivedUxState[] = [];
  const focusSignals = signals.filter((s) => s.type === 'FOCUS_CONTEXT');
  if (focusSignals.length > 0) {
    out.push(
      Object.freeze({
        type: 'FOCUS_ACTIVE',
        severity: 'info',
        confidence: 0.9,
        derivedFrom: Object.freeze(focusSignals.map((s) => s.id)),
      })
    );
  }

  const overloadRelated = signals.filter(
    (s) => s.type === 'OVERLOAD_CONTEXT' || s.type === 'INTERRUPTION_CONTEXT'
  );
  if (overloadRelated.length >= 3) {
    out.push(
      Object.freeze({
        type: 'OVERLOADED',
        severity: 'attention',
        confidence: 0.85,
        derivedFrom: Object.freeze(overloadRelated.map((s) => s.id)),
      })
    );
  }

  const wellbeingSignals = signals.filter((s) => s.type === 'WELLBEING_RISK');
  if (wellbeingSignals.length > 0) {
    out.push(
      Object.freeze({
        type: 'WELLBEING_BLOCK',
        severity: 'info',
        confidence: 0.9,
        derivedFrom: Object.freeze(wellbeingSignals.map((s) => s.id)),
      })
    );
  }

  return out;
}

/** Regole: FOCUS_ACTIVE → FOCUSED; OVERLOADED → OVERLOADED; WELLBEING_BLOCK → BLOCKED; nessuno → NEUTRAL */
function deriveExperienceCandidates(
  uxStates: readonly DerivedUxState[]
): DerivedExperienceCandidate[] {
  const out: DerivedExperienceCandidate[] = [];
  const types = new Set(uxStates.map((u) => u.type));

  if (types.has('FOCUS_ACTIVE')) {
    out.push(
      Object.freeze({
        label: 'FOCUSED',
        confidence: 0.9,
        supportingStates: Object.freeze(['FOCUS_ACTIVE']),
      })
    );
  }
  if (types.has('OVERLOADED')) {
    out.push(
      Object.freeze({
        label: 'OVERLOADED',
        confidence: 0.85,
        supportingStates: Object.freeze(['OVERLOADED']),
      })
    );
  }
  if (types.has('WELLBEING_BLOCK')) {
    out.push(
      Object.freeze({
        label: 'BLOCKED',
        confidence: 0.9,
        supportingStates: Object.freeze(['WELLBEING_BLOCK']),
      })
    );
  }
  if (types.has('WAITING_REPLY')) {
    out.push(
      Object.freeze({
        label: 'WAITING',
        confidence: 0.8,
        supportingStates: Object.freeze(['WAITING_REPLY']),
      })
    );
  }
  if (out.length === 0) {
    out.push(
      Object.freeze({
        label: 'NEUTRAL',
        confidence: 0.5,
        supportingStates: Object.freeze([]),
      })
    );
  }
  return out;
}

/** Feature IDs fissi. Focus-related: focus-guard; Wellbeing: wellbeing-gate; Inbox: smart-inbox */
const FOCUS_FEATURE_IDS = Object.freeze(['focus-guard']);
const WELLBEING_FEATURE_IDS = Object.freeze(['wellbeing-gate']);
const INBOX_FEATURE_IDS = Object.freeze(['smart-inbox']);

/** Regole: focus eligible se FOCUS_ACTIVE; wellbeing se WELLBEING_BLOCK; inbox ineligible se OVERLOADED */
function deriveFeatureEligibility(
  uxStates: readonly DerivedUxState[]
): FeatureEligibility[] {
  const types = new Set(uxStates.map((u) => u.type));
  const out: FeatureEligibility[] = [];

  for (const fid of FOCUS_FEATURE_IDS) {
    const eligible = types.has('FOCUS_ACTIVE');
    out.push(
      Object.freeze({
        featureId: fid,
        eligible,
        reason: eligible ? 'FOCUS_ACTIVE state present' : 'FOCUS_ACTIVE state not present',
        derivedFromStates: Object.freeze(eligible ? ['FOCUS_ACTIVE'] : []),
      })
    );
  }
  for (const fid of WELLBEING_FEATURE_IDS) {
    const eligible = types.has('WELLBEING_BLOCK');
    out.push(
      Object.freeze({
        featureId: fid,
        eligible,
        reason: eligible ? 'WELLBEING_BLOCK state present' : 'WELLBEING_BLOCK state not present',
        derivedFromStates: Object.freeze(eligible ? ['WELLBEING_BLOCK'] : []),
      })
    );
  }
  for (const fid of INBOX_FEATURE_IDS) {
    const ineligible = types.has('OVERLOADED');
    out.push(
      Object.freeze({
        featureId: fid,
        eligible: !ineligible,
        reason: ineligible ? 'OVERLOADED: inbox features suppressed' : 'No OVERLOADED state',
        derivedFromStates: Object.freeze(ineligible ? ['OVERLOADED'] : []),
      })
    );
  }
  return out;
}

export function deriveState(
  semanticSignals: readonly SemanticSignal[],
  now: number
): DerivedStateSnapshot {
  const uxStates = Object.freeze(deriveUxStates(semanticSignals));
  const experienceCandidates = Object.freeze(
    deriveExperienceCandidates(uxStates)
  );
  const featureEligibility = Object.freeze(
    deriveFeatureEligibility(uxStates)
  );
  return Object.freeze({
    uxStates,
    experienceCandidates,
    featureEligibility,
    derivedAt: now,
  });
}
